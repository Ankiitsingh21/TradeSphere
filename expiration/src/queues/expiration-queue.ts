import Queue from "bull";
import { natsWrapper } from "../natswrapper";
import { ExpirationCompletePublisher } from "../events/publishers/expiration-complete-event";
import { PaymentFailureExpirationPublisher } from "../events/publishers/payment-failure-expiration-complete-Publisher";
import { SellPaymentFailureCompletePublisher } from "../events/publishers/sell-payment-failure-event-publisher";

interface Payload {
  orderId: string;
}

interface Payload1 {
  orderId: string;
  expiresAt: string;
  cnt: number;
  matchedQuantity: number;
  resolved: number;
  settleamount: number;
  releaseamount: number;
  userId: string;
  status: string;
}

const expirationQueue = new Queue<Payload>("order:expiration", {
  redis: {
    host: process.env.REDIS_HOST,
  },
});

expirationQueue.process(async (job) => {
  await new ExpirationCompletePublisher(natsWrapper.client).publish({
    orderId: job.data.orderId,
  });
});

const expirationQueuee = new Queue<Payload1>("paymentfailure:expiration", {
  redis: {
    host: process.env.REDIS_HOST,
  },
});

expirationQueuee.process(async (job) => {
  await new PaymentFailureExpirationPublisher(natsWrapper.client).publish({
    orderId: job.data.orderId,
    expiresAt: job.data.expiresAt,
    cnt: job.data.cnt,
    matchedQuantity: job.data.matchedQuantity,
    resolved: job.data.resolved,
    settleamount: job.data.settleamount,
    releaseamount: job.data.releaseamount,
    userId: job.data.userId,
    status: job.data.status,
  });
});

interface payload2 {
  orderId: string;
  userId: string;
  amount: number;
  status: string;
  expiresAt: string;
  cnt: number;
}

const expirationQueueee = new Queue<payload2>("Sellpaymentfailure:expiration", {
  redis: {
    host: process.env.REDIS_HOST,
  },
});

expirationQueueee.process(async (job) => {
  await new SellPaymentFailureCompletePublisher(natsWrapper.client).publish({
    orderId: job.data.orderId,
    expiresAt: job.data.expiresAt,
    cnt: job.data.cnt,
    amount: job.data.amount,
    userId: job.data.userId,
    status: job.data.status,
  });
});

export { expirationQueue, expirationQueuee, expirationQueueee };
