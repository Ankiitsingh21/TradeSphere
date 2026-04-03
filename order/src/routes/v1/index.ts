import { requireAuth, validateRequest } from "@showsphere/common";
import express from "express";
import { body } from "express-validator";
import { buyController } from "../../controller/buy-controller";

const router = express.Router();

router.post("/buy", requireAuth, [
  body("symbol").notEmpty().withMessage("Stock details required"),
  body("quantity")
    .isInt({ gt: 0 })
    .notEmpty()
    .withMessage("the number of stocks can not be null"),
],validateRequest,buyController);

export default router;
