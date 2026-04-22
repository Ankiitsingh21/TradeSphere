import type { PortfolioPosition, Stock } from "@/lib/types";

export interface PortfolioRow {
  symbol: string;
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  totalInvested: number;
  currentValue: number;
  pnl: number;
  pnlPercent: number;
}

export interface PortfolioMetrics {
  totalInvested: number;
  currentValue: number;
  totalPnl: number;
  totalPnlPercent: number;
  positions: number;
}

export function buildStockPriceMap(stocks: Stock[]): Map<string, number> {
  return new Map(stocks.map((stock) => [stock.symbol, stock.price]));
}

export function buildPortfolioRows(
  positions: PortfolioPosition[],
  stockPriceMap: Map<string, number>,
): PortfolioRow[] {
  return positions.map((position) => {
    const currentPrice =
      stockPriceMap.get(position.symbol) ?? position.avgBuyPrice;
    const currentValue = currentPrice * position.quantity;
    const pnl = (currentPrice - position.avgBuyPrice) * position.quantity;
    const pnlPercent =
      position.avgBuyPrice > 0
        ? ((currentPrice - position.avgBuyPrice) / position.avgBuyPrice) * 100
        : 0;

    return {
      symbol: position.symbol,
      quantity: position.quantity,
      avgBuyPrice: position.avgBuyPrice,
      currentPrice,
      totalInvested: position.totalInvested,
      currentValue,
      pnl,
      pnlPercent,
    };
  });
}

export function buildPortfolioMetrics(rows: PortfolioRow[]): PortfolioMetrics {
  const totalInvested = rows.reduce((acc, row) => acc + row.totalInvested, 0);
  const currentValue = rows.reduce((acc, row) => acc + row.currentValue, 0);
  const totalPnl = rows.reduce((acc, row) => acc + row.pnl, 0);

  return {
    totalInvested,
    currentValue,
    totalPnl,
    totalPnlPercent: totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0,
    positions: rows.length,
  };
}

export function getPositionQuantity(
  portfolio: PortfolioPosition[],
  symbol: string,
): number {
  return (
    portfolio.find((position) => position.symbol === symbol)?.quantity ?? 0
  );
}
