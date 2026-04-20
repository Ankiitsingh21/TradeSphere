import { BadRequestError } from "@showsphere/common";
import { prisma } from "../config/db";

const MAX_RETRIES = 3;

export const withdraw = async (userID: string, amount: number) => {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const draw = await prisma.$transaction(async (tx) => {
        const wallet = await tx.wallet.findUnique({
          where: { userId: userID },
        });

        if (!wallet) {
          throw new BadRequestError("wallet not found");
        }

        if (amount > wallet.available_balance.toNumber()) {
          throw new BadRequestError("avaliable balance is insufficient");
        }

        const result = await tx.wallet.updateMany({
          where: {
            id: wallet.id,
            version: wallet.version,
          },
          data: {
            available_balance: { decrement: amount },
            total_balance: { decrement: amount },
            version: { increment: 1 },
          },
        });

        if (result.count === 0) {
          throw Object.assign(
            new Error("Concurrent modification detected"),
            { code: "VERSION_CONFLICT" },
          );
        }

        const update = await tx.wallet.findUnique({ where: { id: wallet.id } });

        const tranc = await tx.transactions.create({
          data: {
            userId: wallet.userId,
            walletId: wallet.id,
            amount: amount,
            type: "WITHDRAW",
          },
        });

        return { tranc, update };
      });

      return draw;
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