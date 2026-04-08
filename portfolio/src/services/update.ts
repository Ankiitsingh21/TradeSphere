import { BadRequestError } from "@showsphere/common";
import { prisma } from "../config/db";
import { Prisma } from "../generated/prisma/client";

export const sell = async (
  userId: string,
  symbol: string,
  sellPrice: number,
  quantity: number
) => {
  const qty = new Prisma.Decimal(quantity);
  const sellP = new Prisma.Decimal(sellPrice);

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
      await tx.portfolio.delete({
        where: {
          userId_symbol: { userId, symbol },
        },
      });

      return {
        message: "Position closed",
        profit: profit.toString(),
      };
    }

    
    const updated = await tx.portfolio.update({
      where: {
        userId_symbol: { userId, symbol },
      },
      data: {
        quantity: newQty,
        totalInvested: newTotal,
      },
    });

    return {
      updated,
      profit: profit.toString(),
    };
  });
};