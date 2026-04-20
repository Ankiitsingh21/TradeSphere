import { TradeStatus, TradeType } from "@showsphere/common";
import { Prisma } from "../generated/prisma/client";
import { getOrderBook } from "../orderBook/map";
import { prisma } from "../config/db";
import { OrderNode } from "../orderBook/queue";
import { sellAddInQueue } from "../orderBook/addInQueue";
import { natsWrapper } from "../natswrapper";
import { TradeExecutedPublisher } from "../events/publishers/trade-event-publisher";

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

  // Case 1: Buy heap empty — try seed match
  if (book.buyHeap.isEmpty()) {
    if (
      book.marketPrice &&
      sellPrice.lte(book.marketPrice) &&
      book.seedBuyQuantity.gte(remainingQty)
    ) {
      book.seedBuyQuantity = book.seedBuyQuantity.minus(remainingQty);
      book.lastPrice = book.marketPrice;

      const orderRecord = await prisma.orderBook.create({
        data: {
          orderId,
          userId,
          symbol,
          totalQuantity: remainingQty,
          matchedQuantity: remainingQty,
          price: book.marketPrice,
          type: TradeType.Sell,
          status: TradeStatus.MATCHED,
        },
      });

      // Seed has no real counterparty — no TradeExecuted needed
      return {
        status: "MATCHED",
        matchedQty: remainingQty,
        tradePrice: book.marketPrice,
        orderRecord,
      };
    }

    return await sellAddInQueue(orderId, userId, remainingQty, price, symbol);
  }

  // Case 2: Real buy heap — check price
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
    // Buyer locked at buyer.price, trades at sellPrice — difference is refunded (per unit)
    const buyerReleaseAmountPerUnit = buyer.price.minus(sellPrice);

    if (remainingQty.equals(buyer.quantity)) {
      // Exact match — buyer fully consumed
      await prisma.orderBook.update({
        where: { id: buyer.id },
        data: { status: TradeStatus.MATCHED, matchedQuantity: remainingQty },
      });
      book.buyHeap.dequeue();

      totalMatchedQty = totalMatchedQty.plus(remainingQty);
      lastTradePrice = tradePrice;
      remainingQty = new Prisma.Decimal(0);

      // Buyer was QUEUED — notify Order Service to settle them
      await new TradeExecutedPublisher(natsWrapper.client).publish({
        orderId: buyer.orderId,
        userId: buyer.userId,
        symbol,
        matchedQty: buyer.quantity,
        tradePrice: sellPrice, // trade happens at seller's ask price
        type: TradeType.Buy,
        releaseAmount: buyerReleaseAmountPerUnit.mul(buyer.quantity),
      });
    } else if (remainingQty.greaterThan(buyer.quantity)) {
      // Buyer fully consumed, seller still has remaining
      await prisma.orderBook.update({
        where: { id: buyer.id },
        data: { status: TradeStatus.MATCHED, matchedQuantity: buyer.quantity },
      });
      book.buyHeap.dequeue();

      totalMatchedQty = totalMatchedQty.plus(buyer.quantity);
      lastTradePrice = tradePrice;
      remainingQty = remainingQty.minus(buyer.quantity);

      // Buyer was QUEUED — notify Order Service to settle them
      await new TradeExecutedPublisher(natsWrapper.client).publish({
        orderId: buyer.orderId,
        userId: buyer.userId,
        symbol,
        matchedQty: buyer.quantity,
        tradePrice: sellPrice,
        type: TradeType.Buy,
        releaseAmount: buyerReleaseAmountPerUnit.mul(buyer.quantity),
      });
    } else {
      // Seller fully consumed, buyer partially consumed — buyer stays in queue
      // matched quantity for this buyer in this round is remainingQty (NOT buyer.quantity)
      const matchedForBuyer = remainingQty;
      const remaining = buyer.quantity.minus(matchedForBuyer);

      await prisma.orderBook.update({
        where: { id: buyer.id },
        data: { matchedQuantity: matchedForBuyer },
      });
      book.buyHeap.dequeue();

      const updatedBuyer: OrderNode = { ...buyer, quantity: remaining };
      book.buyHeap.enqueue(updatedBuyer);

      totalMatchedQty = totalMatchedQty.plus(matchedForBuyer);
      lastTradePrice = tradePrice;
      remainingQty = new Prisma.Decimal(0);

      // Buyer is NOT fully done — no TradeExecuted yet, they stay PENDING
      // If a TradeExecuted were published here, releaseAmount must use matchedForBuyer (remainingQty),
      // not buyer.quantity (original), to avoid over-refunding the locked amount.
    }
  }

  if (totalMatchedQty.gt(0)) {
    const finalStatus = remainingQty.gt(0)
      ? TradeStatus.PARTIAL
      : TradeStatus.MATCHED;

    const orderRecord = await prisma.orderBook.create({
      data: {
        orderId,
        userId,
        symbol,
        totalQuantity: quantity,
        matchedQuantity: totalMatchedQty,
        price: lastTradePrice,
        type: TradeType.Sell,
        status: finalStatus,
      },
    });

    book.lastPrice = lastTradePrice;

    if (remainingQty.gt(0)) {
      await sellAddInQueue(
        `${orderId}-remaining`,
        userId,
        remainingQty,
        price,
        symbol,
      );
      return {
        status: "PARTIAL",
        matchedQty: totalMatchedQty,
        remainingQty,
        tradePrice: lastTradePrice,
        orderRecord,
      };
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
