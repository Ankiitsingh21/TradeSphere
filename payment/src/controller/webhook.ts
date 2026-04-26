import { Request, Response } from 'express';
import { stripe } from '../stripe';
import { prisma } from '../config/db';
import { natsWrapper } from '../natswrapper';
import { PaymentCompletedPublisher } from '../events/publishers/payment-completed-publisher';
import Stripe from 'stripe';

export const stripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;

  try {
    // This is what makes it production-grade — signature verification
    // Only Stripe can produce a valid signature, not a hacker
    event = stripe.webhooks.constructEvent(
      req.body, // raw body — must be Buffer
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    const payment = await prisma.payment.findUnique({
      where: { stripePaymentIntentId: paymentIntent.id },
    });

    if (!payment) {
      console.error('Payment record not found for intent:', paymentIntent.id);
      return res.status(200).send(); // Acknowledge to Stripe anyway
    }

    // Idempotency check — don't credit twice
    if (payment.status === 'COMPLETED') {
      console.log('Payment already completed, skipping:', payment.id);
      return res.status(200).send();
    }

    // Update payment status
    const result = await prisma.payment.updateMany({
      where: { id: payment.id, version: payment.version },
      data: { status: 'COMPLETED', version: { increment: 1 } },
    });

    if (result.count === 0) {
      console.error('OCC conflict on payment update:', payment.id);
      return res.status(200).send(); // Still ack Stripe
    }

    // Publish event → Wallet Service will credit the wallet
    await new PaymentCompletedPublisher(natsWrapper.client).publish({
      paymentId: payment.id,
      userId: payment.userId,
      amount: Number(payment.amount),
      stripePaymentIntentId: paymentIntent.id,
    });

    console.log('Payment completed, wallet credit event published:', payment.id);
  }

  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    await prisma.payment.updateMany({
      where: { stripePaymentIntentId: paymentIntent.id },
      data: { status: 'FAILED', version: { increment: 1 } },
    });

    console.log('Payment failed for intent:', paymentIntent.id);
  }

  res.status(200).send();
};