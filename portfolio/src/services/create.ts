import { BadRequestError } from "@showsphere/common";
import { prisma } from "../config/db";
import { Prisma } from "../generated/prisma/client";

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

  return await prisma.$transaction(async (tx) => {
    const share = await tx.portfolio.findUnique({
      where: {
        userId_symbol: { userId, symbol },
      },
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
        },
      });
    }

    const newInvestment = price.mul(qty);

    const newQty = share.quantity.plus(qty);
    const newTotal = share.totalInvested.plus(newInvestment);

    const newAvg = newTotal.div(newQty);

    return await tx.portfolio.update({
      where: {
        userId_symbol: { userId, symbol },
      },
      data: {
        avgBuyPrice: newAvg,
        totalInvested: newTotal,
        quantity: newQty,
      },
    });
  });
};
