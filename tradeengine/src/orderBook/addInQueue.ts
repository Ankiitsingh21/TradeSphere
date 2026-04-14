import { BadRequestError, TradeStatus, TradeType } from "@showsphere/common";
import { Prisma } from "../generated/prisma/client";
import { getOrderBook } from "./map";
import { prisma } from "../config/db";
import { OrderNode } from "./queue";

export const buyAddInQueue = async (
  orderId: string,
  userId: string,
  quantity: any,
  price: any,
  symbol: string,
) => {
  const pricee = new Prisma.Decimal(price);
  const qty = new Prisma.Decimal(quantity);

  const dbRecord = await prisma.orderBook.create({
    data: {
      orderId,
      userId,
      price: pricee,
      totalQuantity: qty,
      type: TradeType.Buy,
      status: TradeStatus.PENDING,
      symbol,
    },
  });

  if (!dbRecord) throw new BadRequestError("not able to create record");

  const book = getOrderBook(symbol);
  const order: OrderNode = {
    id: dbRecord.id,
    orderId: dbRecord.orderId,
    userId: dbRecord.userId,
    symbol: dbRecord.symbol,
    quantity: dbRecord.totalQuantity,
    price: dbRecord.price,
    type: dbRecord.type as TradeType,
    createdAt: dbRecord.createdAt,
  };

  book.buyHeap.enqueue(order);
  return { status: "QUEUED", dbRecord };
};

export const sellAddInQueue = async (
  orderId: string,
  userId: string,
  quantity: any,
  price: any,
  symbol: string,
) => {
  const pricee = new Prisma.Decimal(price);
  const qty = new Prisma.Decimal(quantity);

  const dbRecord = await prisma.orderBook.create({
    data: {
      orderId,
      userId,
      price: pricee,
      totalQuantity: qty,
      type: TradeType.Sell,
      status: TradeStatus.PENDING,
      symbol,
    },
  });

  if (!dbRecord) throw new BadRequestError("not able to create record");

  const book = getOrderBook(symbol);
  const order: OrderNode = {
    id: dbRecord.id,
    orderId: dbRecord.orderId,
    userId: dbRecord.userId,
    symbol: dbRecord.symbol,
    quantity: dbRecord.totalQuantity,
    price: dbRecord.price,
    type: dbRecord.type as TradeType,
    createdAt: dbRecord.createdAt,
  };

  book.sellHeap.enqueue(order);
  return { status: "QUEUED", dbRecord };
};