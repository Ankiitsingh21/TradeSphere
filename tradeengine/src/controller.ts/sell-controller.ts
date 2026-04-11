import { CustomError } from "@showsphere/common";
import { Request, Response } from "express";
import { buy } from "../services/buy";
import { sell } from "../services/sell";

export const sellController = async (req: Request, res: Response) => {
  try {
    const { orderId, userId, price, quantity, symbol } = req.body;
    const buyy = await sell(orderId, userId, symbol, quantity, price);
    return res.status(201).json({
      success: true,
      data: buyy,
      message: "Successfully matched",
    });
  } catch (error) {
    if (error instanceof CustomError) {
      return res.status(error.statusCode).send({
        success: false,
        message: error.message,
        errors: error.serializeErrors(),
      });
    }
    console.log(error);
    return res.status(400).send({
      success: false,
      message: "Something went wrong at controller layer ",
      errors: error,
    });
  }
};
