import express, { Request, Response } from "express";
import { signUp } from "../../controller/user-controller";
import { body } from "express-validator";
import { currentUser, validateRequest } from "@showsphere/common";
import { signOut } from "../../controller/sign-out-controller";
import { SignIn } from "../../controller/sign-in-controller";

const router = express.Router();

router.post(
  "/sign-up",
  [
    body("email").isEmail().withMessage("Email must be valid"),
    body("password")
      .trim()
      .isLength({ min: 4, max: 20 })
      .withMessage("Password must be between 4 and 20"),
  ],
  validateRequest,
  signUp,
);

router.post("/sign-out", signOut);

router.get("/current-user", currentUser, (req, res) => {
  res.send({ currentUser: req.currentUser || null });
});

router.post(
  "/sign-in",
  [
    body("email").isEmail().withMessage("Email must be valid"),
    body("password")
      .trim()
      .isLength({ min: 4, max: 20 })
      .withMessage("Password must be between 4 and 20"),
  ],
  validateRequest,
  SignIn,
);


router.get('/health',async (req:Request,res:Response) => {

  const date = new Date();
  res.send({date});
});

export default router;
