import { CustomError } from "@showsphere/common";
import { Request, Response } from "express";
import { verifyy } from "../services/verify-holdings";

export const verifyController = async (req: Request, res: Response) => {
  try {
    const userId =
      (req.query.userId as string) || (req.body.userId as string);
    const symbol =
      (req.query.symbol as string) || (req.body.symbol as string);

    if (!userId || !symbol) {
      return res.status(400).json({
        success: false,
        message: "userId and symbol are required",
      });
    }

    const stock = await verifyy(userId, symbol);
    return res.status(201).json({
      success: true,
      data: stock,
      message: "stock verified successfully",
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
      message: "Something went wrong at controller layer",
      errors: error,
    });
  }
};