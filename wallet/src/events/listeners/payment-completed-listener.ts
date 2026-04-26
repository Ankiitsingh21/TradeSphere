import {
  Listener,
  PaymentCompletedEvent,
  Subjects,
} from '@showsphere/common';
import { Message } from 'node-nats-streaming';
import { prisma } from '../../config/db';

const MAX_RETRIES = 3;
const QUEUE_GROUP = 'wallet-Service';

export class PaymentCompletedListener extends Listener<PaymentCompletedEvent> {
  subject: Subjects.PaymentCompleted = Subjects.PaymentCompleted;
  queueGroupName = QUEUE_GROUP;

  async onMessage(data: PaymentCompletedEvent['data'], msg: Message) {
    const { userId, amount, paymentId } = data;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await prisma.$transaction(async (tx) => {
          const wallet = await tx.wallet.findUnique({
            where: { userId },
          });

          if (!wallet) {
            // Auto-create wallet if missing (edge case)
            const created = await tx.wallet.create({
              data: {
                userId,
                total_balance: amount,
                available_balance: amount,
                locked_balance: 0,
                version: 0,
              },
            });

            await tx.transactions.create({
              data: {
                userId,
                walletId: created.id,
                type: 'ADD',
                amount,
              },
            });

            return created;
          }

          const updated = await tx.wallet.updateMany({
            where: { id: wallet.id, version: wallet.version },
            data: {
              total_balance: { increment: amount },
              available_balance: { increment: amount },
              version: { increment: 1 },
            },
          });

          if (updated.count === 0) {
            throw Object.assign(new Error('OCC conflict'), {
              code: 'VERSION_CONFLICT',
            });
          }

          await tx.transactions.create({
            data: {
              userId,
              walletId: wallet.id,
              type: 'ADD',
              amount,
            },
          });

          return await tx.wallet.findUnique({ where: { id: wallet.id } });
        });

        console.log(`Wallet credited ₹${amount} for user ${userId}, paymentId: ${paymentId}`);
        msg.ack();
        return;
      } catch (err: any) {
        if (err?.code === 'VERSION_CONFLICT' && attempt < MAX_RETRIES) {
          await new Promise((res) => setTimeout(res, 50 * attempt));
          continue;
        }
        console.error('PaymentCompletedListener failed:', err);
        // Don't ack — NATS will redeliver
        return;
      }
    }

    console.error(`PaymentCompletedListener exhausted retries for paymentId: ${paymentId}`);
  }
}