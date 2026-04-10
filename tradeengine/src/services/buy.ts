import { BadRequestError, TradeStatus, TradeType } from "@showsphere/common";
import { Prisma } from "../generated/prisma/client";
import { getOrderBook } from "../orderBook/map";
import { prisma } from "../config/db";
import { OrderNode } from "../orderBook/queue";
import { buyAddInQueue, sellAddInQueue } from "../orderBook/addInQueue";

export const buy = async (
  orderId: string,
  userId: string,
  symbol: string,
  quantity: number,
  price: number,
) => {
  const pricee = new Prisma.Decimal(price);
  let qty = new Prisma.Decimal(quantity);

  const book = getOrderBook(symbol);
  const firstSeller = book.sellHeap.front();
  if (!firstSeller || firstSeller.price.greaterThan(pricee)) {
    return await buyAddInQueue(orderId, userId, quantity, price, symbol);
  }

  while (qty.gt(0) && book.sellHeap.size() > 0) {
    const seller = book.sellHeap.front();

    if (seller?.price.gt(pricee)) break;

    if (seller!.quantity.equals(qty)) {
      const sellerPrice = seller!.price;

      const difference = pricee.minus(sellerPrice);

      const releaseAmount = qty.mul(difference);

      const orderRecord = await prisma.orderBook.create({
        data: {
          orderId: orderId,
          userId: userId,
          type: TradeType.Buy,
          status: TradeStatus.MATCHED,
          quantity: qty,
          price: sellerPrice,
          symbol: symbol,
        },
      });

      const update = await prisma.orderBook.update({
        where: {
          id: seller?.id,
        },
        data: {
          status: TradeStatus.MATCHED,
        },
      });
      book.sellHeap.dequeue();

      qty = new Prisma.Decimal(0);
      // qty.minus(topSeller?.quantity);
      //i have to cast a event to order service that trade is executed
      return { orderRecord, releaseAmount };
    } else if (qty.greaterThan(seller!.quantity)) {
      const update = await prisma.orderBook.update({
        where: {
          id: seller?.id,
        },
        data: {
          status: TradeStatus.MATCHED,
        },
      });
      book.sellHeap.dequeue();

      qty = qty.minus(seller!.quantity);
    } else {
      const remaining = seller!.quantity.minus(qty);

      book.sellHeap.dequeue();

      const update = await prisma.orderBook.update({
        where: {
          id: seller?.id,
        },
        data: {
          quantity: remaining,
        },
      });

      const order: OrderNode = {
        id: seller!.id,
        orderId: seller!.orderId,
        userId: seller!.userId,
        symbol: seller!.symbol,
        quantity: remaining,
        price: seller!.price,
        type: seller!.type as TradeType,
        createdAt: seller!.createdAt,
      };
      book.sellHeap.enqueue(order);

      const sellerPrice = seller!.price;

      const difference = pricee.minus(sellerPrice);

      const releaseAmount = qty.mul(difference);
      const orderRecord = await prisma.orderBook.create({
        data: {
          orderId: orderId,
          userId: userId,
          type: TradeType.Buy,
          status: TradeStatus.MATCHED,
          quantity: qty,
          price: sellerPrice,
          symbol: symbol,
        },
      });

      return { orderRecord, releaseAmount };
    }
  }

  if (qty.gt(0)) {
    return await buyAddInQueue(orderId, userId, qty, price, symbol);
  }
};
