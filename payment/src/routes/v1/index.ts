import express, { Request, Response } from 'express';
import { body } from 'express-validator';
import { requireAuth, validateRequest } from '@showsphere/common';
import { initiatePayment } from '../../controller/initiate-payment';
import { stripeWebhook } from '../../controller/webhook';
import { getPaymentHistory } from '../../controller/get-history';

const router = express.Router();

// Webhook — no auth, Stripe calls this directly
router.post('/webhook', stripeWebhook);

// Initiate payment — authenticated user
router.post(
  '/initiate',
  requireAuth,
  [
    body('amount')
      .isFloat({ gt: 0, max: 500000 })
      .withMessage('Amount must be between ₹1 and ₹5,00,000'),
  ],
  validateRequest,
  initiatePayment,
);

// Payment history
router.get('/history', requireAuth, getPaymentHistory);

router.get('/health', async (_req: Request, res: Response) => {
  res.send({ status: 'ok', date: new Date() });
});

export default router;