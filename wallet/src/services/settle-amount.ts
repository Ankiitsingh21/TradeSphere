import { prisma } from "../config/db"



export const settle = async(userID:string,resolve:number,unresolved:number)=>{
        const wallet = await prisma.wallet.findUnique({
                where:{
                        userId:userID
                }
        });

        
}