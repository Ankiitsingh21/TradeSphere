import { CustomError } from "@showsphere/common";
import { Request, Response } from "express";
import { update } from "../services/update-stocks";

export const updateStock = async (req: Request, res: Response) => {
  try {
    const { symbol, price } = req.body;
    const stock = await update(symbol, price);
    return res.status(201).json({
      success: true,
      data: stock,
      message: "stock updated successfully",
    });
  } catch (error) {
    console.log(error);
    if (error instanceof CustomError) {
      return res.status(error.statusCode).send({
        success: false,
        message: error.message,
        errors: error.serializeErrors(),
      });
    }
    return res.status(400).send({
      success: false,
      message: "Something went wrong at controller layer ",
      errors: error,
    });
  }
};
