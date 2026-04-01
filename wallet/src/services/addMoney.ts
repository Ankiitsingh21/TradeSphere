import { BadRequestError } from "@showsphere/common";
import { prisma } from "../config/db";

export const addmoney = async (userID: string, amount: number) => {
  //         console.log("walletID:", walletID);
  // console.log("userID:", userID);
  // console.log("types:", typeof walletID, typeof userID);
  const add = await prisma.$transaction(async (tx) => {
    const userWallet = await tx.wallet.findUnique({
      where: {
        userId: userID,
      },
    });

    // console.log(userWallet);
    if (!userWallet) {
      throw new BadRequestError("wallet has not been found");
    }

    const addmoney = await tx.wallet.update({
      where: {
        id: userWallet.id,
      },
      data: {
        total_balance: {
          increment: amount,
        },
        available_balance: {
          increment: amount,
        },
      },
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
