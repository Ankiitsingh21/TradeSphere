import { BadRequestError } from "@showsphere/common";
import { prisma } from "../config/db"


export const create= async(userId:string,symbol:string,buyPrice:number,quantity:number)=>{
        const find = await prisma.portfolio.findUnique({
                where:{
                        userId:userId,
                        symbol:symbol
                }
        });

        if(!find){
                const totalInvested=buyPrice*quantity;
                const avgPrice=totalInvested/quantity;
                const creat= await prisma.portfolio.create({
                        data:{
                                userId:userId,
                                symbol:symbol,
                                avgBuyPrice:avgPrice,
                                
                        }
                })

        }
}


// model Portfolio {
//   id        String   @id @default(uuid())

//   userId    String
//   symbol    String

//   avgBuyPrice Decimal @db.Decimal(18, 6)

//   quantity    Decimal @db.Decimal(18, 6)

//   totalInvested Decimal @db.Decimal(18, 6)

//   createdAt DateTime @default(now())
//   updatedAt DateTime @updatedAt

//   @@unique([userId, symbol])   
//   @@index([userId])           
//   @@index([symbol])            
// }