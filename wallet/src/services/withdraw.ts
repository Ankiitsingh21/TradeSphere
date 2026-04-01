import { BadRequestError } from "@showsphere/common";
import { prisma } from "../config/db";

export const withdraw = async (userID: string, amount: number) => {
  const draw = await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({
      where: {
        userId: userID,
      },
    });
    if (!wallet) {
      throw new BadRequestError("wallet not found");
    }

    if (amount > wallet.available_balance.toNumber()) {
      throw new BadRequestError("avaliable balance is insufficient");
    }

    const update = await tx.wallet.update({
      where: {
        id: wallet.id,
      },
      data: {
        available_balance: {
          decrement: amount,
        },
        total_balance: {
          decrement: amount,
        },
      },
    });

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
};

// model transactions{
//   id String  @id @default(uuid())
//   userId String
//   walletId String
//   wallet wallet @relation(fields: [walletId],references: [id])

//   type TransactionType

//   amount Decimal

//   createdAt DateTime @default(now())
// }
