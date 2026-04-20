import { requireAuth, validateRequest } from "@showsphere/common";
import express, { Request, Response } from "express";
import { body } from "express-validator";
import { createWallet } from "../../controller/createWallet-controller";
import { addMoney } from "../../controller/add-money-controller";
import { getMoney } from "../../controller/get-money-controller";
import { withdrawMoney } from "../../controller/withdraw-money-controller";
import { lockMoney } from "../../controller/lock-money-controller";
import { settleMoney } from "../../controller/settle-money-controller";
import { creditMoney } from "../../controller/credit-money-controller";

const router = express.Router();

router.post(
  "/create",
  [body("userId").notEmpty().withMessage("userID is required")],
  validateRequest,
  createWallet,
);

router.patch(
  "/add-money",
  requireAuth,
  [
    body("amount")
      .notEmpty()
      .withMessage("amount can not be NULL")
      .isFloat({ gt: 0 })
      .withMessage("amount can not be negative"),
  ],
  validateRequest,
  addMoney,
);

router.get("/check-balance", requireAuth, getMoney);

router.patch(
  "/withdraw",
  requireAuth,
  [
    body("amount")
      .isFloat({ gt: 0 })
      .notEmpty()
      .withMessage("amount can not be negative"),
  ],
  validateRequest,
  withdrawMoney,
);

router.patch(
  "/lock-money",
  [
    body("amount")
      .isFloat({ gt: 0 })
      .notEmpty()
      .withMessage("amount can not be negative"),
    body("userID").notEmpty().withMessage("user ID must be present"),
  ],
  validateRequest,
  lockMoney,
);

router.patch(
  "/settle-money",
  [
    body("settleamount")
      .isNumeric()
      .withMessage("settleamount must be a number"),
    body("releaseamount")
      .isNumeric()
      .withMessage("releaseamount must be a number"),
    body("userID").notEmpty().withMessage("user ID must be present"),
    // Fix: prevent no-op settle calls that create useless transaction records
    body().custom((_, { req }) => {
      const settle = parseFloat(req.body.settleamount);
      const release = parseFloat(req.body.releaseamount);
      if (isNaN(settle) || isNaN(release)) return true; 
      if (settle + release <= 0) {
        throw new Error(
          "settleamount + releaseamount must be greater than 0",
        );
      }
      return true;
    }),
  ],
  validateRequest,
  settleMoney,
);

router.patch(
  "/credit-money",
  [
    body("amount")
      .isFloat({ gt: 0 })
      .withMessage("amount must be a positive number"),
    body("userID").notEmpty().withMessage("userID must be present"),
  ],
  validateRequest,
  creditMoney,
);

router.get("/health", async (req: Request, res: Response) => {
  const date = new Date();
  res.send({ date });
});

export default router;