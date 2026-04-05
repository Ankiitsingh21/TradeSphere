import { BadRequestError } from "@showsphere/common";
import { prisma } from "../config/db";

export const getbyname = async (symbol: string) => {
  const stock = await prisma.stock.findUnique({
    where: {
      symbol: symbol,
    },
  });

  if (!stock) {
    throw new BadRequestError("Not able to find stock");
  }
  return stock;
};
