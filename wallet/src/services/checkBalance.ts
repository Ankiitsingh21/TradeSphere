import { BadRequestError } from "@showsphere/common";
import { prisma } from "../config/db";

export const checkbalance = async (userID: string) => {
  const balance = await prisma.wallet.findUnique({
    where: {
      userId: userID,
    },
  });

  if (!balance) {
    throw new BadRequestError("the wallet has not been found");
  }

  return balance;
};
