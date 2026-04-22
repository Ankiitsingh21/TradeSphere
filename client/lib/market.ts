import type { Stock } from "@/lib/types";

export interface MarketSummary {
  gainers: number;
  losers: number;
  unchanged: number;
  averagePrice: number;
}

export function buildMarketSummary(stocks: Stock[]): MarketSummary {
  if (stocks.length === 0) {
    return {
      gainers: 0,
      losers: 0,
      unchanged: 0,
      averagePrice: 0,
    };
  }

  const averagePrice =
    stocks.reduce((acc, item) => acc + item.price, 0) / stocks.length;

  let gainers = 0;
  let losers = 0;
  let unchanged = 0;

  for (const stock of stocks) {
    if (stock.price > averagePrice * 1.08) {
      gainers += 1;
    } else if (stock.price < averagePrice * 0.92) {
      losers += 1;
    } else {
      unchanged += 1;
    }
  }

  return {
    gainers,
    losers,
    unchanged,
    averagePrice,
  };
}
