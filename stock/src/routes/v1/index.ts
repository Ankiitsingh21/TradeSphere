import { requireAuth, validateRequest } from "@showsphere/common";
import express, { Request, Response } from "express";
import { body } from "express-validator";
import { fetchNse } from "../../controller/fetch-stocks-nse-controller";
import { seedStocks } from "../../controller/seed-stocks-controller";

const router = express.Router();

router.get(
  "/fetch-nse",
  [body("index").notEmpty().withMessage("you must have to provide index")],
  validateRequest,
  fetchNse,
);

router.post(
  "/seed",
  [body("index").notEmpty().withMessage("index can not be empty")],
  validateRequest,
  seedStocks,
);
export default router;
