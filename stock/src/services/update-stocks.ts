import { BadRequestError } from "@showsphere/common";
import { prisma } from "../config/db";

export const update = async (symbol: string, price: number) => {
  const stock = await prisma.stock.update({
    where: {
      symbol: symbol,
    },
    data: {
      price: price,
    },
  });
  if (!stock) {
    throw new BadRequestError("not able to update stock");
  }

  return stock;
};
