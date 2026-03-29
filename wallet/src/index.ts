import { app } from "./app";
import { connectDB } from "./config/db";

const start = async () => {
  if (!process.env.JWT_KEY) {
    throw new Error("JWT_KEY must be defined");
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("incorrect database url");
  }

  await connectDB();


  app.listen(3000, () => {
    console.log(`Listening on 3000`);
  });
};

start();
