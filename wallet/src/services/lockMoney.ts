import { BadRequestError } from "@showsphere/common";
import { prisma } from "../config/db";

const MAX_RETRIES = 3;

export const lockmoney = async (userID: string, amount: number) => {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const lock = await prisma.$transaction(async (tx) => {
        const wallet = await tx.wallet.findUnique({
          where: { userId: userID },
        });

        if (!wallet) {
          throw new BadRequestError("wallet not found");
        }

        const available = wallet.available_balance.toNumber();
        const locked = wallet.locked_balance.toNumber();

        if (amount > available) {
          throw new BadRequestError("Insuffuicient fund can not lock amount");
        }

        const newAvailable = available - amount;
        const newLocked = locked + amount;
        const newTotal = newAvailable + newLocked;

        const result = await tx.wallet.updateMany({
          where: {
            id: wallet.id,
            version: wallet.version,
          },
          data: {
            locked_balance: newLocked,
            available_balance: newAvailable,
            total_balance: newTotal,
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
            type: "LOCK",
            amount: amount,
            userId: wallet.userId,
            walletId: wallet.id,
          },
        });

        return { tranc, update };
      });

      return lock;
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
