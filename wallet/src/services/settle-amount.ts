import { BadRequestError } from "@showsphere/common";
import { prisma } from "../config/db";
import { Prisma } from "../generated/prisma/client";

const MAX_RETRIES = 3;

export const settlemoney = async (
  userID: string,
  settleamount: number,
  releaseamount: number,
) => {
  const settleamountt = new Prisma.Decimal(settleamount);
  const releaseamountt = new Prisma.Decimal(releaseamount);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const settle = await prisma.$transaction(async (tx) => {
        const wallet = await tx.wallet.findUnique({
          where: { userId: userID },
        });

        if (!wallet) {
          throw new BadRequestError("Wallet not found");
        }

        const availb = wallet.available_balance;
        const lockb = wallet.locked_balance;

        if (settleamountt.add(releaseamountt).greaterThan(lockb)) {
          throw new BadRequestError("loacked balance is inusfficient");
        }

        const newL = lockb.minus(settleamountt.add(releaseamountt));
        const newaB = availb.add(releaseamountt);
        const newT = newaB.add(newL);

        const result = await tx.wallet.updateMany({
          where: {
            id: wallet.id,
            version: wallet.version,
          },
          data: {
            locked_balance: newL,
            total_balance: newT,
            available_balance: newaB,
            version: { increment: 1 },
          },
        });

        if (result.count === 0) {
          throw Object.assign(new Error("Concurrent modification detected"), {
            code: "VERSION_CONFLICT",
          });
        }

        const update = await tx.wallet.findUnique({ where: { id: wallet.id } });

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
    } catch (err: any) {
      if (err?.code === "VERSION_CONFLICT" && attempt < MAX_RETRIES) {
        await new Promise((res) => setTimeout(res, 50 * attempt));
        continue;
      }
      throw err;
    }
  }

  throw new BadRequestError(
    "Concurrent modification detected, please retry your request",
  );
};
