import { BadRequestError } from "@showsphere/common";
import { prisma } from "../config/db";

export const marketcreate = async () => {
  const existingmarket = await prisma.marketConfig.findFirst();
  if (existingmarket) {
    return existingmarket;
  }

  const market = await prisma.marketConfig.create({
    data: {
      isOpen: true,
    },
  });
  if (!market) {
    throw new BadRequestError("not able to start market");
  }

  return market;
};
