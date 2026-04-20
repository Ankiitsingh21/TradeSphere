import { BadRequestError } from "@showsphere/common";
import { nseClient } from "../utils/nse-client";
import { prisma } from "../config/db";
import { SeedPublisher } from "../events/publishers/seed-publisher";
import { natsWrapper } from "../natswrapper";

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

  const find = await prisma.stock.findMany();

  //   const eventStocks = find.map((s) => ({
  //   id: s.id,
  //   symbol: s.symbol,
  //   price: s.price.toNumber(),
  //   version: s.version,
  //   createdAt: s.createdAt.toISOString(),
  //   updatedAt: s.updatedAt.toISOString(),
  // }));

  // console.log(find);

  await new SeedPublisher(natsWrapper.client).publish({
    stocks: find,
  });

  return db;
};
