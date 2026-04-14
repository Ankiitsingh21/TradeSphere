import axios from "axios";
import { Prisma } from "../generated/prisma/client";
import { getOrderBook } from "./map";

type Stock = {
  id: string;
  symbol: string;
  price: any;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

const SEED_QUANTITY = new Prisma.Decimal(100000);

// export const seedOrderBooks = async () => {
//   try {
// //     const response = await axios.get("http://stock-srv:3000/api/stocks/internal-all");
// const response = await callWalletService("http://stock-srv:3000/api/stocks/internal-all","get",{});
// // console.log(response.data);
//     const stocks: { symbol: string; price: string }[] = response.data.data;

//     for (const stock of stocks) {
//       const book = getOrderBook(stock.symbol);
//       const price = new Prisma.Decimal(stock.price);

//       book.marketPrice = price;
//       book.seedSellQuantity = SEED_QUANTITY;
//       book.seedBuyQuantity = SEED_QUANTITY;
//     }

//     console.log(`Seeded order books for ${stocks.length} stocks`);
//   } catch (error) {
//     console.error("Failed to seed order books:", error);
//   }
// };

export const seed = async (stocks: Stock[]) => {
  for (const stock of stocks) {
    const book = getOrderBook(stock.symbol);
    const price = new Prisma.Decimal(stock.price);
    book.marketPrice = price;
    book.seedSellQuantity = SEED_QUANTITY;
    book.seedBuyQuantity = SEED_QUANTITY;
  }

  console.log(`Seeded order books for ${stocks.length} stocks`);

  return true;
};

// const callWalletService = async (url: string,method:string, payload?: any) => {
//   try {
//     const response = await axios({
//       method:method,
//       url,
//       data: payload,
//     });
//     // console.log(response.data);

//     return response;
//   } catch (error: any) {
//     return {
//       data: error.response?.data,
//       status: error.response?.status,
//     };
//   }
// };
