import { BadRequestError, CustomError } from "@showsphere/common";
import { Request, Response } from "express";
import { addmoney } from "../services/addMoney";

export const addMoney = async (req: Request, res: Response) => {
  try {
        console.log("hello");
    const { walletID, amount } = req.body;
    console.log(req.currentUser)
    //        const {userID}
//     const userID = req.currentUser!.id;
//     if (typeof userID !== "string") {
//       throw new BadRequestError("userID is incorrect");
//     }
//     console.log(userID);
//     const add = await addmoney(userID, walletID, amount);
    return res.status(201).json({
      success: true,
//       data: add,
      message: "Successfully added a money into wallet",
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
