import { CustomError } from "@showsphere/common";
import { Request, Response } from "express";
import { toggle } from "../services/update-status-market";

export const toggleMarketController = async (req: Request, res: Response) => {
  try {
    const marketToggle = await toggle();
    return res.status(201).json({
      success: true,
      data: marketToggle,
      message: "toggle success",
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
      message: "Something went wrong at controller layer ",
      errors: error,
    });
  }
};
