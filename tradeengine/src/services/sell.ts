import { TradeStatus, TradeType } from "@showsphere/common";
import { prisma } from "../config/db";
import { Prisma } from "../generated/prisma/client";
import { sellAddInQueue } from "../orderBook/addInQueue";
import { getOrderBook } from "../orderBook/map";
import { OrderNode } from "../orderBook/queue";

export const sell = async (
  orderId: string,
  userId: string,
  symbol: string,
  quantity: number,
  price: number,
) => {
  const pricee = new Prisma.Decimal(price);
  let qty = new Prisma.Decimal(quantity);
  const book = getOrderBook(symbol);

  const firstBuyer = book.buyHeap.front();
  if (!firstBuyer || firstBuyer.price.lessThan(pricee)) {
    return await sellAddInQueue(orderId, userId, quantity, price, symbol);
  }

  while (qty.greaterThan(0) && book.buyHeap.size() > 0) {
    const buyer = book.buyHeap.front();

    if (buyer?.price.lessThan(pricee)) break;

    if (qty.equals(buyer!.quantity)) {

        const update= await prisma.orderBook.update({
                where:{
                        id:buyer?.id
                },data:{
                        status:TradeStatus.MATCHED
                }
        });

        book.buyHeap.dequeue();

        const orderBook = await prisma.orderBook.create({
        data: {
          orderId,
          userId,
          price: buyer!.price,
          quantity: qty,
          type: TradeType.Sell,
          status: TradeStatus.MATCHED,
          symbol,
        },
      });

      return orderBook;

    } else if (qty.greaterThan(buyer!.quantity)) {
      const update = await prisma.orderBook.update({
        where: {
          id: buyer!.id,
        },
        data: {
          status: TradeStatus.MATCHED,
        },
      });
      book.buyHeap.dequeue();

      qty = qty.minus(buyer!.quantity);
    } else {
      const remaining = buyer!.quantity.minus(qty);

      const update = await prisma.orderBook.update({
        where: {
          id: buyer?.id,
        },
        data: {
          quantity: remaining,
        },
      });
      book.buyHeap.dequeue();

      const order: OrderNode = {
        id: buyer!.id,
        orderId: buyer!.orderId,
        userId: buyer!.userId,
        symbol: buyer!.symbol,
        quantity: remaining,
        price: buyer!.price,
        type: buyer!.type as TradeType,
        createdAt: buyer!.createdAt,
      };

      book.buyHeap.enqueue(order);

      //i have to wire it with nats and send the release amount also it will be in todo okey

      const orderBook = await prisma.orderBook.create({
        data: {
          orderId,
          userId,
          price: buyer!.price,
          quantity: qty,
          type: TradeType.Sell,
          status: TradeStatus.MATCHED,
          symbol,
        },
      });

      return orderBook;
    }
  }

  if (qty.greaterThan(0)) {
    return await sellAddInQueue(orderId, userId, qty, price, symbol);
  }
};
