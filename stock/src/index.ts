import { app } from "./app";
import { connectDB, prisma } from "./config/db";
import { natsWrapper } from "./natswrapper";
import { marketcreate } from "./services/create-market";
import { seed } from "./services/seed-stocks";

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
  } catch (error) {
    console.error("NATS connection failed, exiting", error);
    process.exit(1);
  }

  const existingCount = await prisma.stock.count();
  if (existingCount === 0) {
    await seed("NIFTY 500");
  }
  await marketcreate();

  app.listen(3000, () => {
    console.log(`Listening on 3000`);
  });
};

start();
