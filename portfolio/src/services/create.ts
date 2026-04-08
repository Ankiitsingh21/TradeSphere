import { BadRequestError } from "@showsphere/common";
import { prisma } from "../config/db"


export const create= async(userId:string,symbol:string,buyPrice:number,quantity:number)=>{
        const add = await prisma.portfolio.create({
                data:{
                        userId:userId,
                        symbol:symbol,
                        buyPrice:buyPrice,
                        quantity:quantity
                }
        });

        if(!add){
                throw new BadRequestError("not able to create now");
        }
        return add;
}



// model portfolio{
//   id String @id @default(uuid())
//   userId String @unique
//   symbol String 
//   buyPrice Decimal
//   quantity Int
//   createdAt DateTime @default(now())
//   updatedAt DateTime @updatedAt
// }