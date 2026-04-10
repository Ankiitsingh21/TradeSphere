import express, { Request, Response } from "express";
import { body } from "express-validator";
import { prisma } from "../../config/db";

const router = express.Router();




router.get("/health", async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    // await prisma.portfolio.findFirst();
    res.status(200).send({
      status: "ok",
      db: "connected",
      timestamp: new Date(),
    });
  } catch (err: any) {
    res.status(500).send({
      status: "error",
      db: "disconnected",
      error: err.message,
      timestamp: new Date(),
    });
  }
});

export default router;
