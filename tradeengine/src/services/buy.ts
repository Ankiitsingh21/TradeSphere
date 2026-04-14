import { TradeStatus, TradeType } from "@showsphere/common";
import { Prisma } from "../generated/prisma/client";
import { getOrderBook } from "../orderBook/map";
import { prisma } from "../config/db";
import { OrderNode } from "../orderBook/queue";
import { buyAddInQueue } from "../orderBook/addInQueue";
import { TradeExecutedPublisher } from "../events/publishers/trade-event-publisher";
import { natsWrapper } from "../natswrapper";

export const buy = async (
  orderId: string,
  userId: string,
  symbol: string,
  quantity: number,
  price: number,
) => {
  const buyPrice = new Prisma.Decimal(price);
  let remainingQty = new Prisma.Decimal(quantity);

  const book = getOrderBook(symbol);

  if (book.sellHeap.isEmpty()) {
    if (
      book.marketPrice &&
      buyPrice.gte(book.marketPrice) &&
      book.seedSellQuantity.gte(remainingQty)
    ) {
      const orderRecord = await prisma.orderBook.create({
        data: {
          orderId,
          userId,
          symbol,
          totalQuantity: remainingQty,
          matchedQuantity:remainingQty,
          price: book.marketPrice,
          type: TradeType.Buy,
          status: TradeStatus.MATCHED,
        },
      });

      book.seedSellQuantity = book.seedSellQuantity.minus(remainingQty);
      book.lastPrice = book.marketPrice;

      return {
        status: "MATCHED",
        matchedQty: remainingQty,
        tradePrice: book.marketPrice,
        releaseAmount: buyPrice.minus(book.marketPrice).mul(remainingQty),
        orderRecord,
      };
    }

    return await buyAddInQueue(orderId, userId, remainingQty, price, symbol);
  }

  const firstSeller = book.sellHeap.front();
  if (firstSeller!.price.greaterThan(buyPrice)) {
    return await buyAddInQueue(orderId, userId, remainingQty, price, symbol);
  }

  let totalMatchedQty = new Prisma.Decimal(0);
  let totalReleaseAmount = new Prisma.Decimal(0);
  let lastTradePrice = buyPrice;

  while (remainingQty.gt(0) && book.sellHeap.size() > 0) {
    const seller = book.sellHeap.front();
    if (!seller || seller.price.gt(buyPrice)) break;

    if (book.cancelledOrders.has(seller.orderId)) {
      book.sellHeap.dequeue();
      book.cancelledOrders.delete(seller.orderId);
      continue;
    }

    const sellerPrice = seller.price;
    const priceDiff = buyPrice.minus(sellerPrice);

    if (remainingQty.equals(seller.quantity)) {
      await prisma.orderBook.update({
        where: { id: seller.id },
        data: { status: TradeStatus.MATCHED ,matchedQuantity:remainingQty},
      });

      book.sellHeap.dequeue();

      totalMatchedQty = totalMatchedQty.plus(remainingQty);
      totalReleaseAmount = totalReleaseAmount.plus(remainingQty.mul(priceDiff));
      lastTradePrice = sellerPrice;
      remainingQty = new Prisma.Decimal(0);

      await new TradeExecutedPublisher(natsWrapper.client).publish({
        orderId: seller.orderId,
        userId: seller.userId,
        symbol,
        matchedQty: seller.quantity,
        tradePrice: sellerPrice,
        type: TradeType.Sell,
      });
    } else if (remainingQty.greaterThan(seller.quantity)) {
      await prisma.orderBook.update({
        where: { id: seller.id },
        data: { status: TradeStatus.MATCHED ,matchedQuantity:seller.quantity },
      });

      book.sellHeap.dequeue();

      totalMatchedQty = totalMatchedQty.plus(seller.quantity);
      totalReleaseAmount = totalReleaseAmount.plus(seller.quantity.mul(priceDiff));
      lastTradePrice = sellerPrice;
      remainingQty = remainingQty.minus(seller.quantity);

       await new TradeExecutedPublisher(natsWrapper.client).publish({
        orderId: seller.orderId,
        userId: seller.userId,
        symbol,
        matchedQty: seller.quantity,
        tradePrice: sellerPrice,
        type: TradeType.Sell,
      })

    } else {
      const remaining = seller.quantity.minus(remainingQty);

      await prisma.orderBook.update({
        where: { id: seller.id },
        data: { matchedQuantity:remainingQty},
      });

      book.sellHeap.dequeue();

      const updatedSeller: OrderNode = {
        ...seller,
        quantity: remaining,
      };
      book.sellHeap.enqueue(updatedSeller);

      totalMatchedQty = totalMatchedQty.plus(remainingQty);
      totalReleaseAmount = totalReleaseAmount.plus(remainingQty.mul(priceDiff));
      lastTradePrice = sellerPrice;
      remainingQty = new Prisma.Decimal(0);
    }
  }

  if (totalMatchedQty.gt(0)) {
    const orderRecord = await prisma.orderBook.create({
      data: {
        orderId,
        userId,
        symbol,
        totalQuantity: quantity,
        matchedQuantity: totalMatchedQty,
        price: lastTradePrice,
        type: TradeType.Buy,
        status: TradeStatus.MATCHED,
      },
    });

    book.lastPrice = lastTradePrice;

    if (remainingQty.gt(0)) {
      await buyAddInQueue(`${orderId}-remaining`, userId, remainingQty, price, symbol);
      return {
        status: "PARTIAL",
        matchedQty: totalMatchedQty,
        remainingQty,
        releaseAmount: totalReleaseAmount,
        tradePrice: lastTradePrice,
        orderRecord,
      };
    }

    return {
      status: "MATCHED",
      matchedQty: totalMatchedQty,
      releaseAmount: totalReleaseAmount,
      tradePrice: lastTradePrice,
      orderRecord,
    };
  }

  return await buyAddInQueue(orderId, userId, remainingQty, price, symbol);
};