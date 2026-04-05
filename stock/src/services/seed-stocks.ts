import { BadRequestError } from "@showsphere/common";
import { nseClient } from "../utils/nse-client";
import { prisma } from "../config/db";

export const seed = async (index: string) => {
  const { data } = await nseClient.get(
    `/equity-stockIndices?index=${encodeURIComponent(index)}`,
  );

  if (!data || !data.data) {
    throw new BadRequestError("not able to fetch from nse api");
  }

  const stocks = data.data
    .filter((s: any) => s.symbol !== index)
    .map((s: any) => ({
      symbol: s.symbol,
      price: s.lastPrice.toString(),
    }));

  const db = await prisma.stock.createMany({
    data: stocks,
    skipDuplicates: true,
  });

  // console.log(db)

  return db;
};
