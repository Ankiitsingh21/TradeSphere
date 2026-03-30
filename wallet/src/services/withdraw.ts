import { BadRequestError } from "@showsphere/common";
import { prisma } from "../config/db";

export const withdraw = async (userID: string, amount: number) => {
  const wallet = await prisma.wallet.findFirst({
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

  const update = await prisma.wallet.update({
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

  const tranc = await prisma.transactions.create({
    data: {
      userId: wallet.userId,
      walletId: wallet.id,
      amount: amount,
      type: "WITHDRAW",
    },
  });

  return { tranc, update };
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
