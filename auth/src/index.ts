import express, { Request, Response } from "express";
import api from "./routes/index";
import { connectDB } from "./config/db";
import { BadRequestError, errorHandler } from "@showsphere/common";
import cookieSession from "cookie-session";

const app = express();
app.use(express.json());
app.use(
  cookieSession({
    signed: false,
    secure: false,
  }),
);

app.use("/api", api);

app.use(errorHandler);

const start = async () => {
  // process.env.MONGO_URI="mongodb://localhost:27017/auth";

  if (!process.env.JWT_KEY) {
    // console.log(process.env.JWT_KEY);
    throw new Error("JWT_KEY must be defined");
  }

  await connectDB();

  app.listen(3000, () => {
    console.log(`Listening on ${3000}`);
  });
};

start();
