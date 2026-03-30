import { requireAuth, validateRequest } from "@showsphere/common";
import express, { Request, Response } from "express";
import { body } from "express-validator";
import { createWallet } from "../../controller/createWallet-controller";
import { addMoney } from "../../controller/add-money-controller";
import { getMoney } from "../../controller/get-money-controller";

const router = express.Router();

router.post(
  "/create",
  [body("userId").notEmpty().withMessage("userID is required")],
  validateRequest,
  createWallet,
);

router.post(
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

export default router;
