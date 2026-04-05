import { CustomError } from "@showsphere/common";
import { Request, Response } from "express";
import { get } from "../services/get-stocks";

export const getStocks = async (req: Request, res: Response) => {
  try {
    const stocks = await get();
    return res.status(201).json({
      success: true,
      data: stocks,
      message: "stock fetch successfully",
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
