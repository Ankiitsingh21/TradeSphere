import { BadRequestError } from "@showsphere/common";
import { prisma } from "../config/db";

const MAX_RETRIES = 3;

export const credit = async (userID: string, amount: number) => {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const cred = await prisma.$transaction(async (tx) => {
        const wallet = await tx.wallet.findUnique({
          where: { userId: userID },
        });

        if (!wallet) {
          throw new BadRequestError("Wallet not found");
        }

        const result = await tx.wallet.updateMany({
          where: {
            id: wallet.id,
            version: wallet.version,
          },
          data: {
            available_balance: { increment: amount },
            total_balance: { increment: amount },
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
            amount: amount,
            type: "CREDIT",
          },
        });

        return { tranc, update };
      });

      return cred;
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
