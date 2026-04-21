import { PaymentFailureListener } from "./events/listeners/payment-failure-listener";
import { SellPaymentFailureListener } from "./events/listeners/sell-payment-failure-listener";
import { TradeOrderCreatedListener } from "./events/listeners/TradeOrderCreated-listener";
import { natsWrapper } from "./natswrapper";
import { expirationQueue, expirationQueuee, expirationQueueee } from "./queues/expiration-queue";

const start = async () => {
  if (!process.env.NATS_CLIENT_ID) {
    throw new Error("NATS_CLIENT_ID is incorrect");
  }
  if (!process.env.NATS_CLUSTER_ID) {
    throw new Error("NATS_CLUSTER_ID is incorrect");
  }
  if (!process.env.NATS_URL) {
    throw new Error("NATS_URL is incorrect");
  }

  try {
    await natsWrapper.connect(
      process.env.NATS_CLUSTER_ID,
      process.env.NATS_CLIENT_ID,
      process.env.NATS_URL,
    );
    natsWrapper.client.on("close", () => {
      console.log("NATS connection closed!");
      process.exit();
    });

    process.on("SIGINT", () => natsWrapper.client.close());
    process.on("SIGTERM", async () => {
        await expirationQueue.close();
        await expirationQueuee.close();
        await expirationQueueee.close();
        natsWrapper.client.close();
    });

    new TradeOrderCreatedListener(natsWrapper.client).listen();
    new PaymentFailureListener(natsWrapper.client).listen();
    new SellPaymentFailureListener(natsWrapper.client).listen();
  } catch (err) {
    // Fix: was silently returning — queues initialize but can never publish
    console.error("NATS connection failed, exiting", err);
    process.exit(1);
  }
};

start();
