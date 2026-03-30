import { validateRequest } from "@showsphere/common";
import express, { Request, Response } from "express";
import {body} from 'express-validator'
import { createWallet } from "../../controller/createWallet-controller";

const router = express.Router();

router.post("/create", [
  body('userId').notEmpty().withMessage("userID is required")
],validateRequest,createWallet);

export default router;
