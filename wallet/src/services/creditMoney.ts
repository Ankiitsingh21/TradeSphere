import { BadRequestError } from "@showsphere/common";
import { prisma } from "../config/db";

export const credit = async (userID: string, amount: number) => {
  const wallet = await prisma.wallet.findUnique({
    where: {
      userId: userID,
    },
  });
  if (!wallet) {
    throw new BadRequestError("Wallet not found");
  }

  const cred = await prisma.$transaction(async (tx) => {
    const update = await prisma.wallet.update({
      where: {
        id: wallet.id,
      },
      data: {
        available_balance: {
          increment: amount,
        },
        total_balance: {
          increment: amount,
        },
      },
    });

    const tranc = await prisma.transactions.create({
      data: {
        walletId: wallet.id,
        userId: wallet.userId,
        amount: amount,
        type: "CREDIT",
      },
    });
    return { tranc, update };
  });
  return cred;
};
