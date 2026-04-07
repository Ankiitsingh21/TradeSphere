import express from "express";
import v1apiRoutes from "./v1";

const router = express.Router();

router.use("/portfolio", v1apiRoutes);

export default router;
