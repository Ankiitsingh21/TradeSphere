import { CustomError } from "@showsphere/common";
import { Request, Response } from "express";
import { getbyname } from "../services/get-By-name";

export const getByName = async (req: Request, res: Response) => {
  try {
    const symbol = (req.query.symbol as string) || (req.body.symbol as string);
    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: "symbol is required",
      });
    }
    const stock = await getbyname(symbol);
    return res.status(201).json({
      success: true,
      data: stock,
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
      message: "Something went wrong at controller layer",
      errors: error,
    });
  }
};