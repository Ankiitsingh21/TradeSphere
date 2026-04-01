import { CustomError } from "@showsphere/common";
import { Request, Response } from "express";
import { lockmoney } from "../services/lockMoney";

export const lockMoney = async (req: Request, res: Response) => {
  try {
    const userID = req.currentUser!.id;
    const { amount } = req.body;
    const lock = await lockmoney(userID, amount);
    return res.status(201).json({
      success: true,
      data: lock,
      currntBalance: lock.total_balance,
      message: "Successfully locked a money into wallet",
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
