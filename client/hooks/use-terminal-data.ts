"use client";

import { useMemo } from "react";

import { usePortfolioQuery } from "@/hooks/queries/use-portfolio";
import { useStocksQuery } from "@/hooks/queries/use-stocks";
import { useWalletBalanceQuery } from "@/hooks/queries/use-wallet-balance";
import { EMPTY_WALLET } from "@/lib/defaults";
import { buildMarketSummary } from "@/lib/market";
import { buildOrderMetrics } from "@/lib/order-metrics";
import { useOrderStore } from "@/lib/order-store";
import {
  buildPortfolioMetrics,
  buildPortfolioRows,
  buildStockPriceMap,
} from "@/lib/portfolio-metrics";

export function useTerminalData(enabled = true) {
  const walletQuery = useWalletBalanceQuery(enabled);
  const stocksQuery = useStocksQuery(enabled);
  const portfolioQuery = usePortfolioQuery(enabled);

  const orders = useOrderStore((state) => state.orders);

  const wallet = walletQuery.data ?? EMPTY_WALLET;
  const stocks = useMemo(() => stocksQuery.data ?? [], [stocksQuery.data]);
  const portfolio = useMemo(
    () => portfolioQuery.data ?? [],
    [portfolioQuery.data],
  );

  const stockPriceMap = useMemo(() => buildStockPriceMap(stocks), [stocks]);
  const portfolioRows = useMemo(
    () => buildPortfolioRows(portfolio, stockPriceMap),
    [portfolio, stockPriceMap],
  );

  const portfolioMetrics = useMemo(
    () => buildPortfolioMetrics(portfolioRows),
    [portfolioRows],
  );

  const marketSummary = useMemo(() => buildMarketSummary(stocks), [stocks]);
  const orderMetrics = useMemo(() => buildOrderMetrics(orders), [orders]);

  const isLoading =
    walletQuery.isLoading || stocksQuery.isLoading || portfolioQuery.isLoading;
  const isFetching =
    walletQuery.isFetching ||
    stocksQuery.isFetching ||
    portfolioQuery.isFetching;
  const hasError = Boolean(
    walletQuery.error || stocksQuery.error || portfolioQuery.error,
  );

  return {
    wallet,
    stocks,
    portfolio,
    portfolioRows,
    portfolioMetrics,
    marketSummary,
    orders,
    orderMetrics,
    isLoading,
    isFetching,
    hasError,
    refetchAll: async () => {
      await Promise.all([
        walletQuery.refetch(),
        stocksQuery.refetch(),
        portfolioQuery.refetch(),
      ]);
    },
  };
}
