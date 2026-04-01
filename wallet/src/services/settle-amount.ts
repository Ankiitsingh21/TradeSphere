import { BadRequestError } from "@showsphere/common";
import { prisma } from "../config/db";

export const settlemoney = async (userID: string, amount: number) => {
  const wallet = await prisma.wallet.findUnique({
    where: {
      userId: userID,
    },
  });

  if (!wallet) {
    throw new BadRequestError("Wallet not found");
  }

  const availb = wallet.available_balance.toNumber();
  const totalb = wallet.total_balance.toNumber();
  const lockb = wallet.locked_balance.toNumber();

  if (amount > lockb) {
    throw new BadRequestError("loacked balance is inusfficient");
  }

  const newL = lockb - amount;
  const newT = availb + newL;

  const update = await prisma.wallet.update({
    where: {
      id: wallet.id,
    },
    data: {
      locked_balance: newL,
      total_balance: newT,
    },
  });

  const tranc = await prisma.transactions.create({
    data: {
      walletId: wallet.id,
      userId: wallet.userId,
      amount: amount,
      type: "SETTLE",
    },
  });

  return { tranc, update };
};
