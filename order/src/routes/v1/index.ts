import { requireAuth, validateRequest } from "@showsphere/common";
import express from "express";
import { body } from "express-validator";
import { buyController } from "../../controller/buy-controller";
import { sellController } from "../../controller/sell-controller";

const router = express.Router();

router.post(
  "/buy",
  requireAuth,
  [
    body("symbol").notEmpty().withMessage("Stock details required"),
    body("quantity")
      .isInt({ gt: 0 })
      .notEmpty()
      .withMessage("the number of stocks can not be null"),
  ],
  validateRequest,
  buyController,
);

router.post(
  "/sell",
  requireAuth,
  [
    body("symbol").notEmpty().withMessage("Stock details required"),
    body("quantity")
      .isInt({ gt: 0 })
      .notEmpty()
      .withMessage("the number of stocks can not be null"),
  ],
  validateRequest,
  sellController,
);

export default router;
