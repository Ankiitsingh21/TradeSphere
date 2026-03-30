import { BadRequestError } from "@showsphere/common";
import { prisma } from "../config/db";

export const checkbalance = async (userID: string) => {
  const balance = await prisma.wallet.findFirst({
    where: {
      userId: userID,
    },
  });

  if (!balance) {
    throw new BadRequestError("the user has not been found");
  }

  return balance;
};
