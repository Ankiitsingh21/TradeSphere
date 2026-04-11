import { TradeStatus, TradeType } from "@showsphere/common";
import { Prisma } from "../generated/prisma/client";
import { getOrderBook } from "../orderBook/map";
import { prisma } from "../config/db";
import { OrderNode } from "../orderBook/queue";
import { sellAddInQueue } from "../orderBook/addInQueue";

export const sell = async (
  orderId: string,
  userId: string,
  symbol: string,
  quantity: number,
  price: number,
) => {
  const sellPrice = new Prisma.Decimal(price);
  let remainingQty = new Prisma.Decimal(quantity);

  const book = getOrderBook(symbol);

  // Case 1: Buy heap is empty — try seed match
  if (book.buyHeap.isEmpty()) {
    if (
      book.marketPrice &&
      sellPrice.lte(book.marketPrice) &&
      book.seedBuyQuantity.gte(remainingQty)
    ) {
      // Direct seed match — seller gets market price
      book.seedBuyQuantity = book.seedBuyQuantity.minus(remainingQty);
      book.lastPrice = book.marketPrice;

      const orderRecord = await prisma.orderBook.create({
        data: {
          orderId,
          userId,
          symbol,
          quantity: remainingQty,
          price: book.marketPrice,
          type: TradeType.Sell,
          status: TradeStatus.MATCHED,
        },
      });

      // TODO: publish trade:executed NATS event
      // { orderId, userId, symbol, matchedQty: remainingQty, tradePrice: book.marketPrice }

      return {
        status: "MATCHED",
        matchedQty: remainingQty,
        tradePrice: book.marketPrice,
        orderRecord,
      };
    }

    return await sellAddInQueue(orderId, userId, remainingQty, price, symbol);
  }

  // Case 2: Buy heap has real orders — run matching loop
  const firstBuyer = book.buyHeap.front();
  if (firstBuyer!.price.lessThan(sellPrice)) {
    return await sellAddInQueue(orderId, userId, remainingQty, price, symbol);
  }

  let totalMatchedQty = new Prisma.Decimal(0);
  let lastTradePrice = sellPrice;

  while (remainingQty.gt(0) && book.buyHeap.size() > 0) {
    const buyer = book.buyHeap.front();
    if (!buyer || buyer.price.lessThan(sellPrice)) break;

    if (book.cancelledOrders.has(buyer.orderId)) {
      book.buyHeap.dequeue();
      book.cancelledOrders.delete(buyer.orderId);
      continue;
    }

    const tradePrice = buyer.price;

    if (remainingQty.equals(buyer.quantity)) {
      // Exact match
      await prisma.orderBook.update({
        where: { id: buyer.id },
        data: { status: TradeStatus.MATCHED },
      });

      book.buyHeap.dequeue();

      totalMatchedQty = totalMatchedQty.plus(remainingQty);
      lastTradePrice = tradePrice;
      remainingQty = new Prisma.Decimal(0);

      // TODO: publish trade:executed NATS event for buyer
      // { orderId: buyer.orderId, userId: buyer.userId, symbol, matchedQty: buyer.quantity, tradePrice, releaseAmount: (buyer.price - sellPrice) * qty }

    } else if (remainingQty.greaterThan(buyer.quantity)) {
      // Buyer fully consumed, seller still has remaining
      await prisma.orderBook.update({
        where: { id: buyer.id },
        data: { status: TradeStatus.MATCHED },
      });

      book.buyHeap.dequeue();

      totalMatchedQty = totalMatchedQty.plus(buyer.quantity);
      lastTradePrice = tradePrice;
      remainingQty = remainingQty.minus(buyer.quantity);

      // TODO: publish trade:executed NATS event for buyer

    } else {
      // Seller fully consumed, buyer partially consumed
      const remaining = buyer.quantity.minus(remainingQty);

      await prisma.orderBook.update({
        where: { id: buyer.id },
        data: { quantity: remaining },
      });

      book.buyHeap.dequeue();

      const updatedBuyer: OrderNode = {
        ...buyer,
        quantity: remaining,
      };
      book.buyHeap.enqueue(updatedBuyer);

      totalMatchedQty = totalMatchedQty.plus(remainingQty);
      lastTradePrice = tradePrice;
      remainingQty = new Prisma.Decimal(0);
    }
  }

  if (totalMatchedQty.gt(0)) {
    const orderRecord = await prisma.orderBook.create({
      data: {
        orderId,
        userId,
        symbol,
        quantity: totalMatchedQty,
        price: lastTradePrice,
        type: TradeType.Sell,
        status: TradeStatus.MATCHED,
      },
    });

    book.lastPrice = lastTradePrice;

    // TODO: publish trade:executed NATS event for seller
    // { orderId, userId, symbol, matchedQty: totalMatchedQty, tradePrice: lastTradePrice }

    if (remainingQty.gt(0)) {
      await sellAddInQueue(orderId, userId, remainingQty, price, symbol);
    }

    return {
      status: "MATCHED",
      matchedQty: totalMatchedQty,
      tradePrice: lastTradePrice,
      orderRecord,
    };
  }

  return await sellAddInQueue(orderId, userId, remainingQty, price, symbol);
};