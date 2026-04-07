import { BadRequestError } from "@showsphere/common";
import { prisma } from "../config/db";

export const toggle = async () => {
  const market = await prisma.marketConfig.findMany({});
  if (!market) {
    throw new BadRequestError(
      "market is not present or facing any serious issue",
    );
  }

  // console.log(market);
  const toggle = await prisma.marketConfig.update({
    where: {
      id: market[0].id,
    },
    data: {
      isOpen: !market[0].isOpen,
    },
  });
  return toggle;
};
