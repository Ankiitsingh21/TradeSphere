import { BadRequestError } from "@showsphere/common";
import { prisma } from "../config/db";

export const update = async (symbol: string, price: number) => {

  const find = await prisma.stock.findUnique({
    where:{
      symbol:symbol
    }
  })

  if(!find){
    throw new BadRequestError("stock not found");
  }
  // console.log(symbol)
  const stock = await prisma.stock.update({
    where: {
      symbol: symbol
    },
    data: {
      price: price,
    },
  });
  if (!stock) {
    throw new BadRequestError("not able to update stock");
  }

  return stock;
};
