import { BadRequestError } from "@showsphere/common";
import { prisma } from "../config/db";

export const settlemoney = async (
  userID: string,
  settleamount: number,
  releaseamount: number,
) => {
  const settle = await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({
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

    if (settleamount + releaseamount > lockb) {
      throw new BadRequestError("loacked balance is inusfficient");
    }

    const newL = lockb - (settleamount + releaseamount);
    const newaB = availb + releaseamount;
    const newT = newaB + newL;

    const update = await tx.wallet.update({
      where: {
        id: wallet.id,
      },
      data: {
        locked_balance: newL,
        total_balance: newT,
        available_balance: newaB,
      },
    });

    const tranc = await tx.transactions.create({
      data: {
        walletId: wallet.id,
        userId: wallet.userId,
        amount: settleamount,
        type: "SETTLE",
      },
    });

    const transc = await tx.transactions.create({
      data: {
        type: "UNLOCK",
        amount: releaseamount,
        userId: wallet.userId,
        walletId: wallet.id,
      },
    });

    return { tranc, transc, update };
  });
  return settle;
};
