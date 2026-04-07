import { NextFunction, Request, Response } from "express";
import { prisma } from "../config/db";
import { BadRequestError } from "@showsphere/common";



async function isMarketOpen(req:Request,res:Response,next:NextFunction){
        const market = await prisma.marketConfig.findFirst();
        if(!market){
                throw new BadRequestError("market not found");
        }

        if(!market.isOpen){
                throw new BadRequestError("market is not open");    
        }

        next();
}

export default isMarketOpen;