import { BadRequestError } from "@showsphere/common";
import { prisma } from "../config/db";

export const addmoney = async (
  walletID: string,
  userID: string,
  amount: number,
) => {
  //         console.log("walletID:", walletID);
  // console.log("userID:", userID);
  // console.log("types:", typeof walletID, typeof userID);
  const userWallet = await prisma.wallet.findFirst({
    where: {
      id: walletID,
      userId: userID,
    },
  });

  //     console.log(userWallet);
  if (!userWallet) {
    throw new BadRequestError("wallet has not been found");
  }

  const addmoney = await prisma.wallet.update({
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

  const createtransactions = await prisma.transactions.create({
    data: {
      userId: userWallet.userId,
      walletId: userWallet.id,
      type: "ADD",
      amount: amount,
    },
  });

  return { createtransactions, addmoney };
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
