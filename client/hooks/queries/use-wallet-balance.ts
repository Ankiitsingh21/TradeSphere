"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchWalletBalance } from "@/lib/api/wallet";
import { queryKeys } from "@/lib/query-keys";

export function useWalletBalanceQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.walletBalance,
    queryFn: fetchWalletBalance,
    enabled,
    refetchInterval: 10_000,
  });
}
