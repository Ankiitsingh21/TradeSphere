import { BadRequestError } from "@showsphere/common";
import { prisma } from "../config/db";

export const createwallet = async (userId: string) => {
  try {
    console.log(userId);
    const user = await prisma.wallet.create({
      data: {
        userId: userId,
      },
    });

    console.log("wallet craeted ");
    return user;
  } catch (error) {
    console.log(error);
    throw new BadRequestError(
      "Not able to create a new user  at service layer",
    );
  }
};
