import { PriorityQueue } from "@datastructures-js/priority-queue";
import { OrderNode, compareBuy, compareSell } from "./queue";
import { Prisma } from "../generated/prisma/client";

export interface OrderBook {
  buyHeap: PriorityQueue<OrderNode>;
  sellHeap: PriorityQueue<OrderNode>;
  lastPrice: Prisma.Decimal | null;
  marketPrice: Prisma.Decimal | null;
  seedSellQuantity: Prisma.Decimal;
  seedBuyQuantity: Prisma.Decimal;
  cancelledOrders: Set<string>;
}

const orderBooks = new Map<string, OrderBook>();

export const getOrderBook = (symbol: string): OrderBook => {
  if (!orderBooks.has(symbol)) {
    orderBooks.set(symbol, {
      buyHeap: new PriorityQueue<OrderNode>(compareBuy),
      sellHeap: new PriorityQueue<OrderNode>(compareSell),
      lastPrice: null,
      marketPrice: null,
      seedSellQuantity: new Prisma.Decimal(0),
      seedBuyQuantity: new Prisma.Decimal(0),
      cancelledOrders: new Set<string>(),
    });
  }
  return orderBooks.get(symbol)!;
};