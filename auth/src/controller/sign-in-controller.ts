import { Request, Response } from "express";
import SignInService from "../services/sign-in-service";
import { CustomError } from "@showsphere/common";

const signIn = new SignInService();

const SignIn = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const data = await signIn.signIn(email, password);
    return res.status(201).json({
      success: true,
      data: data,
      message: "Successfully created a new User",
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

export { SignIn };
