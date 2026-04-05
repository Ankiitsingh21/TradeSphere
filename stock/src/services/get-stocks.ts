import { BadRequestError } from "@showsphere/common";
import { prisma } from "../config/db";

export const get = async () => {
  const stocks = await prisma.stock.findMany({});
  if (!stocks) {
    throw new BadRequestError("not able to find stocks");
  }
  return stocks;
};
