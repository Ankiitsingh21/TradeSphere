"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPortfolio } from "@/lib/api/portfolio";
import { queryKeys } from "@/lib/query-keys";

export function usePortfolioQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.portfolio,
    queryFn: fetchPortfolio,
    enabled,
    refetchInterval: 12_000,
  });
}
