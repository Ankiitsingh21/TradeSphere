import { BadRequestError } from "@showsphere/common"
import { prisma } from "../config/db";


export const buy = async(userID:string, symbol:string,quantity:number)=>{
        // const fetch = #current price fetching but not present for now so mimicking okey
        const fetch={
                name:"rel",
                price:95
        }
        const price= fetch.price

        if(!fetch || !price){
                throw new BadRequestError("not able to fetch the latest price of stock ");
        }

        
}