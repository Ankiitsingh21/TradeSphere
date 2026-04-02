import express, { Request, Response } from "express";


const router = express.Router();

router.post('/buy',async(req,res:Response)=>{
        res.send({});
})

export default router;
