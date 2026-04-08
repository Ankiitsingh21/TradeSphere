import { prisma } from "../config/db"


export const update = async(userId:string,quantity:number,buyPrice:number,symbol:string)=>{
        const find = await prisma.portfolio.findUnique({
                where:{
                        userId:userId,
                        symbol:symbol
                }
        })
}