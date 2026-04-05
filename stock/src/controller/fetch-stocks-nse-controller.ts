import { CustomError } from "@showsphere/common";
import { Request, Response } from "express";
import { fetch } from "../services/fetch-stocks-nse";

export const fetchNse = async (req: Request, res: Response) => {
  try {
    const { index } = req.body;
    const data = await fetch(index);

    const stocks = data.data
      .filter((s: any) => s.symbol !== index)
      .map((s: any) => ({
        symbol: s.symbol,
        price: s.lastPrice,
      }));
    return res.status(201).json({
      success: true,
      data: stocks,
      message: "stock buy successfully",
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
