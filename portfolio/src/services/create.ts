import { BadRequestError } from "@showsphere/common";
import { prisma } from "../config/db";
import { Prisma } from "../generated/prisma/client";

const MAX_RETRIES = 3;

export const buy = async (
  userId: string,
  symbol: string,
  buyPrice: number,
  quantity: number,
) => {
  const price = new Prisma.Decimal(buyPrice);
  const qty = new Prisma.Decimal(quantity);

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
          const totalInvested = price.mul(qty);
          return await tx.portfolio.create({
            data: {
              userId,
              symbol,
              avgBuyPrice: price,
              totalInvested,
              quantity: qty,
              version: 0,
            },
          });
        }

        const newInvestment = price.mul(qty);
        const newQty = share.quantity.plus(qty);
        const newTotal = share.totalInvested.plus(newInvestment);
        const newAvg = newTotal.div(newQty);

        const updated = await tx.portfolio.updateMany({
          where: {
            userId: userId,
            symbol: symbol,
            version: share.version,
          },
          data: {
            avgBuyPrice: newAvg,
            totalInvested: newTotal,
            quantity: newQty,
            version: { increment: 1 },
          },
        });

        if (updated.count === 0) {
          throw Object.assign(
            new Error("Concurrent modification detected"),
            { code: "VERSION_CONFLICT" },
          );
        }

        return await tx.portfolio.findUnique({
          where: { userId_symbol: { userId, symbol } },
        });
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