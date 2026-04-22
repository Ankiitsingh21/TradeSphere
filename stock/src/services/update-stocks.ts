import { BadRequestError } from "@showsphere/common";
import { prisma } from "../config/db";
import { StockPriceUpdatedPublisher } from "../events/publishers/stock-price-updated-publisher";
import { natsWrapper } from "../natswrapper";
import { broadcastStockPrice } from "../sse/sse-manager";

export const update = async (symbol: string, price: number) => {
  const find = await prisma.stock.findUnique({
    where: { symbol: symbol },
  });

  if (!find) {
    throw new BadRequestError("stock not found");
  }

  const result = await prisma.stock.updateMany({
    where: {
      symbol: symbol,
      version: find.version,
    },
    data: {
      price: price,
      version: { increment: 1 },
    },
  });

  if (result.count === 0) {
    throw new BadRequestError("Concurrent price update detected, please retry");
  }

  const updated = await prisma.stock.findUnique({ where: { symbol: symbol } });

  if (!updated) {
    throw new BadRequestError("not able to update stock");
  }

  const eventData = {
    stockId: updated.id,
    symbol: updated.symbol,
    price: updated.price.toNumber(),
    previousPrice: find.price.toNumber(),
    version: updated.version,
    updatedAt: updated.updatedAt.toISOString(),
  };

  await new StockPriceUpdatedPublisher(natsWrapper.client).publish(eventData);

  broadcastStockPrice({
    symbol: eventData.symbol,
    price: eventData.price,
    previousPrice: eventData.previousPrice,
    updatedAt: eventData.updatedAt,
  });

  return updated;
};
