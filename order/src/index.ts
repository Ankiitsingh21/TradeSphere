import { app } from "./app";
import { connectDB } from "./config/db";
import { OrderCancelledListener } from "./events/listeners/order-cancelled-listener";
import { TradeExecutedListener } from "./events/listeners/trade-executed-event-listener";
import { natsWrapper } from "./natswrapper";

const start = async () => {
  if (!process.env.JWT_KEY) {
    throw new Error("JWT_KEY must be defined");
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("incorrect database url");
  }
  if (!process.env.NATS_CLIENT_ID) {
    throw new Error("NATS_CLIENT_ID is incorrect");
  }
  if (!process.env.NATS_CLUSTER_ID) {
    throw new Error("NATS_CLUSTER_ID is incorrect");
  }
  if (!process.env.NATS_URL) {
    throw new Error("NATS_URL is incorrect");
  }

  await connectDB();

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
    process.on("SIGTERM", () => natsWrapper.client.close());

    new TradeExecutedListener(natsWrapper.client).listen();
    new OrderCancelledListener(natsWrapper.client).listen();
  } catch (error) {
    console.error("NATS connection failed, exiting", error);
    process.exit(1);
  }

  app.listen(3000, () => {
    console.log(`Listening on 3000`);
  });
};

start();
