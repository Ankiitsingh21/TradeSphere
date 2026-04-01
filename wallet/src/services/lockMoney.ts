import { BadRequestError } from "@showsphere/common";
import { prisma } from "../config/db";

export const lockmoney = async (userID: string, amount: number) => {
  const lock = await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({
      where: {
        userId: userID,
      },
    });
    if (!wallet) {
      throw new BadRequestError("wallet not found");
    }

    const available = wallet.available_balance.toNumber();
    const locked = wallet.locked_balance.toNumber();

    if (amount > available) {
      throw new BadRequestError("Insuffuicient fund can not lock amount");
    }

    // const total =
    const newAvailable = available - amount;
    const newLocked = locked + amount;
    const newTotal = newAvailable + newLocked;
    const update = await tx.wallet.update({
      where: {
        id: wallet.id,
      },
      data: {
        locked_balance: newLocked,
        available_balance: newAvailable,
        total_balance: newTotal,
        version: {
          increment: 1,
        },
      },
    });

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
};

// model wallet{
//   id String @id @default(uuid())
//   userId String @unique
//   total_balance Decimal @default(0.0)
//   available_balance Decimal @default(0.0)
//   locked_balance Decimal @default(0.0)
//   version Int @default(0)
//   createdAt DateTime @default(now())
//   updatedAt DateTime @updatedAt

//   transactions      transactions[]
// }

// model transactions{
//   id String  @id @default(uuid())
//   userId String
//   walletId String
//   wallet wallet @relation(fields: [walletId],references: [id])

//   type TransactionType

//   amount Decimal

//   createdAt DateTime @default(now())
// }
