import { BadRequestError } from "@showsphere/common";
import { prisma } from "../config/db";

const MAX_RETRIES = 3;

export const addmoney = async (userID: string, amount: number) => {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const add = await prisma.$transaction(async (tx) => {
        const userWallet = await tx.wallet.findUnique({
          where: { userId: userID },
        });

        if (!userWallet) {
          throw new BadRequestError("wallet has not been found");
        }

        const result = await tx.wallet.updateMany({
          where: {
            id: userWallet.id,
            version: userWallet.version,
          },
          data: {
            total_balance: { increment: amount },
            available_balance: { increment: amount },
            version: { increment: 1 },
          },
        });

        if (result.count === 0) {
          throw Object.assign(
            new Error("Concurrent modification detected"),
            { code: "VERSION_CONFLICT" },
          );
        }

        const addmoney = await tx.wallet.findUnique({
          where: { id: userWallet.id },
        });

        const createtransactions = await tx.transactions.create({
          data: {
            userId: userWallet.userId,
            walletId: userWallet.id,
            type: "ADD",
            amount: amount,
          },
        });

        return { createtransactions, addmoney };
      });

      return add;
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