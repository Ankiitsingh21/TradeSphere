import { CustomError } from "@showsphere/common";
import { Request, Response } from "express";
import { seed } from "../services/seed-stocks";

export const seedStocks = async (req: Request, res: Response) => {
  try {
    const { index } = req.body;
    const data = await seed(index);
    return res.status(201).json({
      success: true,
      data: data,
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
