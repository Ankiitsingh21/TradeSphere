import { CustomError } from "@showsphere/common";
import { Request, Response } from "express";
import { credit } from "../services/creditMoney";

export const creditMoney = async (req: Request, res: Response) => {
  try {
    //     const userID = req.currentUser!.id;
    const { amount, userID } = req.body;
    // console.log(amount, userID);
    const cred = await credit(userID, amount);
    return res.status(201).json({
      success: true,
      data: cred,
      currntBalance: cred,
      message: "Successfully creda money into wallet",
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
      message:
        "Something went wrong at controller layer ,not able to update or credit money",
      errors: error,
    });
  }
};
