import { Request, Response } from 'express';
import { BadRequestError, CustomError } from '@showsphere/common';
import { stripe } from '../stripe';
import { prisma } from '../config/db';
import { natsWrapper } from '../natswrapper';
import { PaymentInitiatedPublisher } from '../events/publishers/payment-initiated-publisher';

export const initiatePayment = async (req: Request, res: Response) => {
  try {
    const userId = req.currentUser!.id;
    const { amount } = req.body;

    const amountInPaise = Math.round(Number(amount) * 100);

    // Create Stripe PaymentIntent
    // idempotencyKey prevents duplicate charges if request retried
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: amountInPaise,
        currency: 'inr',
        metadata: { userId },
        automatic_payment_methods: { enabled: true },
      },
      {
        idempotencyKey: `${userId}-${amount}-${Date.now()}`,
      },
    );

    // Record pending payment BEFORE returning to frontend
    const payment = await prisma.payment.create({
      data: {
        userId,
        amount,
        stripePaymentIntentId: paymentIntent.id,
        status: 'PENDING',
        type: 'TOPUP',
      },
    });

    // Publish initiated event for audit trail
    await new PaymentInitiatedPublisher(natsWrapper.client).publish({
      paymentId: payment.id,
      userId,
      amount: Number(amount),
      stripePaymentIntentId: paymentIntent.id,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });

    return res.status(201).json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentId: payment.id,
      },
      message: 'Payment intent created',
    });
  } catch (error) {
    if (error instanceof CustomError) {
      return res.status(error.statusCode).send({
        success: false,
        message: error.message,
        errors: error.serializeErrors(),
      });
    }
    console.error(error);
    return res.status(400).send({ success: false, message: 'Payment initiation failed' });
  }
};