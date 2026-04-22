"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getApiErrorMessage } from "@/lib/api/errors";
import { placeOrder } from "@/lib/api/orders";
import { getPositionQuantity } from "@/lib/portfolio-metrics";
import { queryKeys } from "@/lib/query-keys";
import type {
  PlaceOrderPayload,
  PortfolioPosition,
  WalletBalance,
} from "@/lib/types";
import { useOrderStore } from "@/lib/order-store";

interface PlaceOrderContext {
  baselineQuantity: number;
  baselineWallet: number;
}

export function usePlaceOrderMutation() {
  const queryClient = useQueryClient();
  const upsertOrder = useOrderStore((state) => state.upsertOrder);

  return useMutation({
    mutationFn: (payload: PlaceOrderPayload) => placeOrder(payload),
    onMutate: async (payload): Promise<PlaceOrderContext> => {
      const portfolio =
        queryClient.getQueryData<PortfolioPosition[]>(queryKeys.portfolio) ??
        [];
      const wallet = queryClient.getQueryData<WalletBalance>(
        queryKeys.walletBalance,
      );

      return {
        baselineQuantity: getPositionQuantity(portfolio, payload.symbol),
        baselineWallet: wallet?.availableBalance ?? 0,
      };
    },
    onSuccess: async (order, _payload, context) => {
      upsertOrder(
        order,
        context?.baselineQuantity ?? 0,
        context?.baselineWallet ?? 0,
      );

      toast.success(`${order.side} order placed: ${order.symbol}`);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.walletBalance }),
        queryClient.invalidateQueries({ queryKey: queryKeys.portfolio }),
        queryClient.invalidateQueries({ queryKey: queryKeys.stocks }),
      ]);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Could not place order"));
    },
  });
}
