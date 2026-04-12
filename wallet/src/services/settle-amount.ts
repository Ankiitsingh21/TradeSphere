import { BadRequestError } from "@showsphere/common";
import { prisma } from "../config/db";
import { Prisma } from "../generated/prisma/client";

export const settlemoney = async (
  userID: string,
  settleamount: number,
  releaseamount: number,
) => {
  const settleamountt = new Prisma.Decimal(settleamount);
  const releaseamountt = new Prisma.Decimal(releaseamount);
  const settle = await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({
      where: {
        userId: userID,
      },
    });

    if (!wallet) {
      throw new BadRequestError("Wallet not found");
    }

    const availb = wallet.available_balance;
    // const availb =  new Prisma.Decimal(availbb);
    const total = wallet.total_balance;
    const lockb = wallet.locked_balance;
    // console.log(lockb);
    // const lockb= new Prisma.Decimal(lockbb);
    if (settleamountt.add(releaseamountt).greaterThan( lockb)) {
      // console.log((settleamountt+releaseamountt>lockb));
      throw new BadRequestError("loacked balance is inusfficient");
    }
    const newL = lockb.minus(settleamountt.add(releaseamountt));
    const newaB = availb.add(releaseamountt);
    const newT = newaB.add(newL);

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
        amount: settleamountt,
        type: "SETTLE",
      },
    });

    const transc = await tx.transactions.create({
      data: {
        type: "UNLOCK",
        amount: releaseamountt,
        userId: wallet.userId,
        walletId: wallet.id,
      },
    });

    return { tranc, transc, update };
  });
  return settle;
};
