import { Request, Response } from "express";

const signOut = async (req: Request, res: Response) => {
  try {
    req.session = null;
    return res.status(201).json({
      success: true,
      data: {},
      message: "Successfully Sign Out",
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      message: "Something went wrong at controller layer ",
      errors: error,
    });
  }
};

export { signOut };
