import { BadRequestError, TradeStatus, TradeType } from "@showsphere/common";
import { Prisma } from "../generated/prisma/client";
import { getOrderBook } from "../orderBook/map";
import { prisma } from "../config/db";
import { OrderNode } from "../orderBook/queue";

export const buy = async (
  orderId: string,
  userId: string,
  symbol: string,
  quantity: number,
  price: number,
) => {
  const pricee = new Prisma.Decimal(price);
  const qty = new Prisma.Decimal(quantity);

  const book = getOrderBook(symbol);
  const topSeller = book.sellHeap.front();
  if (!topSeller || topSeller.price.greaterThan(pricee)) {
    return await addInQueue(orderId, userId, quantity, price, symbol);
  }


  while(qty.gt(0) && book.sellHeap.size()>0){
        

        if(topSeller!.quantity.equals(qty)){
                const sellerPrice=topSeller!.price;


                const difference = pricee.minus(sellerPrice);

                const releaseAmount = qty.mul(difference);


                const orderRecord = await prisma.orderBook.create({
                        data:{
                                orderId:orderId,
                                userId:userId,
                                type:TradeType.Buy,
                                status:TradeStatus.MATCHED,
                                quantity:qty,
                                price:sellerPrice,
                                symbol:symbol
                        }
                });

                const update = await prisma.orderBook.update({
                        where:{
                                id:topSeller?.id
                        },data:{
                                status:TradeStatus.MATCHED
                        }
                })

                //i have to cast a event to order service that trade is executed 
                return {orderRecord,releaseAmount};
        }else if(qty.lessThan(topSeller.quantity)){
                
        }
  }

};
const addInQueue = async (
  orderId: string,
  userId: string,
  quantity: number,
  price: number,
  symbol: string,
) => {
  // const dbRecord = await prisma.$transaction(async(tx)=>{

  const pricee = new Prisma.Decimal(price);
  const qty = new Prisma.Decimal(quantity);
  const dbRecord = await prisma.orderBook.create({
    data: {
      orderId: orderId,
      userId: userId,
      price: pricee,
      quantity: qty,
      type: TradeType.Buy,
      status: TradeStatus.PENDING,
      symbol: symbol,
    },
  });

  // return db;
  // });

  const book = getOrderBook(symbol);
  if (!dbRecord) {
    throw new BadRequestError("not able to change create record");
  }

  const order: OrderNode = {
    id: dbRecord.id,
    orderId: dbRecord.orderId,
    userId: dbRecord.userId,
    symbol: dbRecord.symbol,
    quantity: dbRecord.quantity,
    price: dbRecord.price,
    type: dbRecord.type as TradeType,
    createdAt: dbRecord.createdAt,
  };

  book.buyHeap.enqueue(order);
  return dbRecord;
};

// model orderBook{
//   id String @id @default(uuid())
//   orderId String @unique
//   userId String
//   symbol String
//   quantity Decimal @db.Decimal(18,6)
//   price Decimal @db.Decimal(18,6)
//   type TradeType
//   status TradeStatus

//   createdAt DateTime @default(now())
//   updatedAt DateTime @updatedAt
// }
