import { PriorityQueue } from "@datastructures-js/priority-queue";
import { Prisma } from "../generated/prisma/client";
import { Subjects, TradeType } from "@showsphere/common";

export interface OrderNode {
  id: string;
  orderId: string;
  userId: string;
  symbol: string;
  quantity: Prisma.Decimal;
  price: Prisma.Decimal;
  type: TradeType;
  createdAt: Date;
}

export const compareBuy = (a: OrderNode, b: OrderNode) => {
  const priceDiff = b.price.cmp(a.price);

  if (priceDiff === 0) {
    return a.createdAt.getTime() - b.createdAt.getTime();
  }
  return priceDiff;
};

export const compareSell = (a: OrderNode, b: OrderNode) => {
  const priceDiff = a.price.cmp(b.price);

  if (priceDiff === 0) {
    return a.createdAt.getTime() - b.createdAt.getTime();
  }
  return priceDiff;
};
