import { requireAuth, validateRequest } from "@showsphere/common";
import express, { Request, Response } from "express";
import { body } from "express-validator";
import { createWallet } from "../../controller/createWallet-controller";
import { addMoney } from "../../controller/add-money-controller";
import { getMoney } from "../../controller/get-money-controller";
import { withdrawMoney } from "../../controller/withdraw-money-controller";
import { lockMoney } from "../../controller/lock-money-controller";
import { settleMoney } from "../../controller/settle-money-controller";

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
    body("walletID").notEmpty().withMessage("wallet id must not be empty "),
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
  [body("amount").isFloat({ gt: 0 }).withMessage("amount can not be negative")],
  validateRequest,
  withdrawMoney,
);

router.patch(
  "/lock-money",
  requireAuth,
  [body("amount").isFloat({ gt: 0 }).withMessage("amount can not be negative")],
  validateRequest,
  lockMoney,
);

router.patch(
  "/settle-money",
  requireAuth,
  [body("settleamount").isFloat({ gt: 0 }).withMessage("amount can not be negative"),
   body("releaseamount").isFloat({ gt: 0 }).withMessage("amount can not be negative")
  ],
  validateRequest,
  settleMoney,
);

export default router;
