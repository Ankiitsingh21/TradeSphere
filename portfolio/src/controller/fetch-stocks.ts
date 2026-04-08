import { CustomError } from "@showsphere/common";
import { Request, Response } from "express";
import { prisma } from "../config/db";


export const fetchStocks = async (req:Request,res:Response) => {
        try {
                const userID = req.currentUser!.id;
                const {symbol} = req.body;
                const stock = await prisma.portfolio
                return res.status(201).json({
      success: true,
      data: stock,
      message: "stock fetched successfully",
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
}