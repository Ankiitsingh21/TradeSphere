import { CustomError } from "@showsphere/common";
import { Request, Response } from "express";
import { withdraw } from "../services/withdraw";

export const withdrawMoney = async (req: Request, res: Response) => {
  try {
    const userID = req.currentUser!.id;
    const { amount } = req.body;

    const balance = await withdraw(userID, amount);
    return res.status(201).json({
      success: true,
      data: balance.tranc,
      currntBalance: balance.update,
      message: "Successfully withdraw  a money from wallet",
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
