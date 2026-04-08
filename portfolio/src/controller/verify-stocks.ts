import { CustomError } from "@showsphere/common";
import { Request, Response } from "express";
import { verifyy } from "../services/verify-holdings";

export const verifyController = async (req: Request, res: Response) => {
  try {
    const { userId, symbol } = req.body;
    // console.log(userId,symbol);
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
      message: "Something went wrong at controller layer ",
      errors: error,
    });
  }
};
