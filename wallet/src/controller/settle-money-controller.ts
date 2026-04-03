import { CustomError } from "@showsphere/common";
import { Request, Response } from "express";
import { settlemoney } from "../services/settle-amount";

export const settleMoney = async (req: Request, res: Response) => {
  try {
    // const userID = req.currentUser!.id;
    const { settleamount, releaseamount ,userID} = req.body;
    const settle = await settlemoney(userID, settleamount, releaseamount);
    return res.status(201).json({
      success: true,
      data: settle.tranc,
      currntBalance: settle.update,
      message: "Successfully settle  a money from wallet",
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
