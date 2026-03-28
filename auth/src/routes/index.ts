import express from "express";
import v1apiRoutes from "./v1";

const router = express.Router();

router.use("/users", v1apiRoutes);

export default router;
