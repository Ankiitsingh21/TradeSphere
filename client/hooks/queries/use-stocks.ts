"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchStocks } from "@/lib/api/stocks";
import { queryKeys } from "@/lib/query-keys";

export function useStocksQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.stocks,
    queryFn: fetchStocks,
    enabled,
    refetchInterval: 5_000,
  });
}
