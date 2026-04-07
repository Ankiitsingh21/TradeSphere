import { requireAuth, validateRequest } from "@showsphere/common";
import express, { Request, Response } from "express";
import { body } from "express-validator";
import { fetchNse } from "../../controller/fetch-stocks-nse-controller";
import { seedStocks } from "../../controller/seed-stocks-controller";
import { getStocks } from "../../controller/get-stocks-controller";
import { getByName } from "../../controller/get-BySymbol-controller";
import { createConrtoller } from "../../controller/create-stock-controller";
import { updateStock } from "../../controller/update-stock-controller";

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

router.get("/stocks", requireAuth, getStocks);

router.get("/stock-symbol", requireAuth, getByName);

router.post(
  "/stock-create",
  requireAuth,
  [
    body("symbol").notEmpty().withMessage("name must be needed as symbol"),
    body("price")
      .notEmpty()
      .isInt({ gt: 0 })
      .withMessage("price must be given and the price can not be less then 0"),
  ],
  createConrtoller,
);

router.patch(
  "/update-stock",
  requireAuth,
  [
    body("symbol").notEmpty().withMessage("symbol is needed to find"),
    body("price")
      .isInt({ gt: 0 })
      .notEmpty()
      .withMessage("price is needed to update"),
  ],
  updateStock,
);


router.get('/health',async (req:Request,res:Response) => {

  const date = new Date();
  res.send({date});
});

export default router;
