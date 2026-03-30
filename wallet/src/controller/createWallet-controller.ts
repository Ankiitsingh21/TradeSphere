import { Request, Response } from "express";
import { createwallet } from "../services/createWallet";
import { CustomError } from "@showsphere/common";

export const createWallet = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const wallet = await createwallet(userId);
    return res.status(201).json({
      success: true,
      data: wallet,
      message: "Successfully created a wallet",
    });
  } catch (error) {
    if (error instanceof CustomError) {
      return res.status(error.statusCode).send({
        success: false,
        message: error.message,
        errors: error.serializeErrors(),
      });
    }
    // console.log(error);
    return res.status(400).send({
      success: false,
      message: "Something went wrong at controller layer ",
      errors: error,
    });
  }
};
