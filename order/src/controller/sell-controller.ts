import { CustomError } from "@showsphere/common";
import { Request, Response } from "express";
import { sell } from "../services/sell-service";

export const sellController = async (req: Request, res: Response) => {
  try {
    const userID = req.currentUser!.id;
    const { symbol, quantity } = req.body;
    //     console.log(userID,symbol,quantity);
    const resp = await sell(userID, symbol, quantity);
    return res.status(201).json({
      success: true,
      data: resp,
      message: "stock sell successfully",
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
