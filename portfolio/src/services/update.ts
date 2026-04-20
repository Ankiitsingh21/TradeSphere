import { BadRequestError } from "@showsphere/common";
import { prisma } from "../config/db";
import { Prisma } from "../generated/prisma/client";

const MAX_RETRIES = 3;

export const sell = async (
  userId: string,
  symbol: string,
  sellPrice: number,
  quantity: number,
) => {
  const qty = new Prisma.Decimal(quantity);
  const sellP = new Prisma.Decimal(sellPrice);

  if (qty.lte(0)) {
    throw new BadRequestError("Quantity must be greater than 0");
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const share = await tx.portfolio.findUnique({
          where: { userId_symbol: { userId, symbol } },
        });

        if (!share) {
          throw new BadRequestError("Stock not found");
        }

        if (qty.gt(share.quantity)) {
          throw new BadRequestError("Not enough quantity to sell");
        }

        const avgPrice = share.avgBuyPrice;
        const cost = avgPrice.mul(qty);
        const revenue = sellP.mul(qty);
        const profit = revenue.minus(cost);

        const newQty = share.quantity.minus(qty);
        const newTotal = share.totalInvested.minus(cost);

        if (newQty.eq(0)) {
          const deleted = await tx.portfolio.deleteMany({
            where: {
              userId: userId,
              symbol: symbol,
              version: share.version,
            },
          });

          if (deleted.count === 0) {
            throw Object.assign(
              new Error("Concurrent modification detected"),
              { code: "VERSION_CONFLICT" },
            );
          }

          return { message: "Position closed", profit: profit.toString() };
        }

        const updated = await tx.portfolio.updateMany({
          where: {
            userId: userId,
            symbol: symbol,
            version: share.version,
          },
          data: {
            quantity: newQty,
            totalInvested: newTotal,
            version: { increment: 1 },
          },
        });

        if (updated.count === 0) {
          throw Object.assign(
            new Error("Concurrent modification detected"),
            { code: "VERSION_CONFLICT" },
          );
        }

        const updatedShare = await tx.portfolio.findUnique({
          where: { userId_symbol: { userId, symbol } },
        });

        return { updated: updatedShare, profit: profit.toString() };
      });

      return result;
    } catch (err: any) {
      if (err?.code === "VERSION_CONFLICT" && attempt < MAX_RETRIES) {
        await new Promise((res) => setTimeout(res, 50 * attempt));
        continue;
      }
      throw err;
    }
  }

  throw new BadRequestError(
    "Concurrent modification detected, please retry your request",
  );
};