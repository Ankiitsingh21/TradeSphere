import { BadRequestError } from "@showsphere/common"
import { prisma } from "../config/db"


export const get = async(userID:string,symbol?:string)=>{
        if(symbol){
                const find = await prisma.portfolio.findUnique({
                        where:{
                                userId_symbol:{
                                        userId:userID,
                                        symbol:symbol
                                }
                        }
                })
                if(!find){
                        throw new BadRequestError("sotck not found");
                }
                return find;
        }


        const stock = await prisma.portfolio.findFirst({
                where:{
                        userId:userID
                }
        });

        if(!stock){
                throw new BadRequestError("stock not found");
        }
        return stock;
}