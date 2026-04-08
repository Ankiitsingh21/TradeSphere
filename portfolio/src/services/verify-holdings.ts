import { BadRequestError } from "@showsphere/common";
import { prisma } from "../config/db";

export const verifyy = async (userId: string, symbol: string) => {
  const stock = await prisma.portfolio.findUnique({
    where: {
      userId_symbol: {
        userId: userId,
        symbol: symbol,
      },
    },
  });
  if (!stock) {
    throw new BadRequestError("the stock has not been found");
  }
  return stock;
};
