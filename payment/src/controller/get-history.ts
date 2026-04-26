import { Request, Response } from 'express';
import { CustomError } from '@showsphere/common';
import { prisma } from '../config/db';

export const getPaymentHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.currentUser!.id;

    const payments = await prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return res.status(200).json({
      success: true,
      data: payments,
      message: 'Payment history fetched',
    });
  } catch (error) {
    if (error instanceof CustomError) {
      return res.status(error.statusCode).send({
        success: false,
        message: error.message,
        errors: error.serializeErrors(),
      });
    }
    return res.status(400).send({ success: false, message: 'Failed to fetch history' });
  }
};