import express from "express";
import api from "./routes/index";
import { errorHandler, NotFoundError } from "@showsphere/common";
import cookieSession from "cookie-session";

const app = express();

app.set("trust proxy", true);

app.use(express.json());

app.use(
  cookieSession({
    signed: false,
    secure: false,
  }),
);

app.use("/api", api);

app.use(errorHandler);

export { app };
