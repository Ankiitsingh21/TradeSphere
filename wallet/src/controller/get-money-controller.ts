import { BadRequestError, CustomError } from "@showsphere/common";
import { Request, Response } from "express";
import { checkbalance } from "../services/checkBalance";

export const getMoney = async (req: Request, res: Response) => {
  try {
    const userID = req.currentUser!.id;

    const balance = await checkbalance(userID);
    return res.status(201).json({
      success: true,
      balance: balance,
      message: "Successfully fetch  a money from wallet",
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
