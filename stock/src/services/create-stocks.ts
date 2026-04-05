import { BadRequestError } from "@showsphere/common";
import { prisma } from "../config/db";

export const create = async (symbol: string, price: number) => {
  const db = await prisma.stock.create({
    data: {
      symbol: symbol,
      price: price,
    },
  });

  if (!db) {
    throw new BadRequestError("not able to create a new stock");
  }

  return db;
};
