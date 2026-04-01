import { Request, Response } from "express";
import UserService from "../services/sign-up";
import { CustomError } from "@showsphere/common";

const userService = new UserService();

const signUp = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await userService.signup(email, password);
    // console.log(user);
    req.session = {
      jwt: user.userJwt,
    };
    return res.status(201).json({
      success: true,
      data: user.userJwt,
      // userID: user.i
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

export { signUp };
