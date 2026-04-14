import express, { Request, Response } from "express";
import { body } from "express-validator";
import { prisma } from "../../config/db";
import { validateRequest } from "@showsphere/common";
import { buyController } from "../../controller.ts/buy-controller";
import { sellController } from "../../controller.ts/sell-controller";

const router = express.Router();

//  const { orderId, userId, price, quantity, symbol } = req.body;

router.post(
  "/buy",
  [
    body("orderId").notEmpty().withMessage("orderId must be present"),
    body("userId").notEmpty().withMessage("userId must be present"),
    body("price").notEmpty().withMessage("price must be present"),
    body("quantity").notEmpty().withMessage("quantity must be present"),
    body("symbol").notEmpty().withMessage("symbol must be present"),
  ],
  validateRequest,
  buyController,
);

router.post(
  "/sell",
  [
    body("orderId").notEmpty().withMessage("orderId must be present"),
    body("userId").notEmpty().withMessage("userId must be present"),
    body("price").notEmpty().withMessage("price must be present"),
    body("quantity").notEmpty().withMessage("quantity must be present"),
    body("symbol").notEmpty().withMessage("symbol must be present"),
  ],
  validateRequest,
  sellController,
);

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
