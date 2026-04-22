"use client";

import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchPortfolio } from "@/lib/api/portfolio";
import { fetchWalletBalance } from "@/lib/api/wallet";
import { isPendingOrder } from "@/lib/order-status";
import {
  buildStockPriceMap,
  getPositionQuantity,
} from "@/lib/portfolio-metrics";
import { queryKeys } from "@/lib/query-keys";
import type { OrderStatus, Stock } from "@/lib/types";
import { useOrderStore } from "@/lib/order-store";
import { useStockStream } from "@/hooks/use-stock-stream";

interface Snapshot {
  wallet: Awaited<ReturnType<typeof fetchWalletBalance>>;
  portfolio: Awaited<ReturnType<typeof fetchPortfolio>>;
  now: number;
}

const EPSILON = 0.000001;

function inferStatus(
  orderQuantity: number,
  changedQuantity: number,
  isExpired: boolean,
): { status: OrderStatus; matchedQuantity: number } | null {
  const matchedQuantity = Math.max(0, Math.min(orderQuantity, changedQuantity));

  if (matchedQuantity >= orderQuantity - EPSILON) {
    return {
      status: "SUCCESS",
      matchedQuantity: orderQuantity,
    };
  }

  if (matchedQuantity > EPSILON) {
    return {
      status: isExpired ? "PARTIAL_EXPIRED" : "PARTIAL_FILLED",
      matchedQuantity,
    };
  }

  if (isExpired) {
    return {
      status: "EXPIRED",
      matchedQuantity: 0,
    };
  }

  return null;
}

export function usePendingOrderPoller() {
  const queryClient = useQueryClient();
  const orders = useOrderStore((state) => state.orders);
  const patchOrder = useOrderStore((state) => state.patchOrder);

  useStockStream();

  const pendingOrders = useMemo(
    () => orders.filter((order) => isPendingOrder(order.status)),
    [orders],
  );

  const pollerQuery = useQuery({
    queryKey: [
      "pending-orders-poller",
      pendingOrders.map((order) => `${order.id}:${order.status}`),
    ],
    queryFn: async (): Promise<Snapshot> => {
      const [wallet, portfolio] = await Promise.all([
        fetchWalletBalance(),
        fetchPortfolio(),
      ]);

      return {
        wallet,
        portfolio,
        now: Date.now(),
      };
    },
    enabled: pendingOrders.length > 0,
    refetchInterval: 3_000,
    refetchIntervalInBackground: true,
    staleTime: 0,
    gcTime: 0,
  });

  useEffect(() => {
    const snapshot = pollerQuery.data;
    if (!snapshot) {
      return;
    }

    queryClient.setQueryData(queryKeys.walletBalance, snapshot.wallet);
    queryClient.setQueryData(queryKeys.portfolio, snapshot.portfolio);
    const stocks = queryClient.getQueryData<Stock[]>(queryKeys.stocks) ?? [];

    const priceMap = buildStockPriceMap(stocks);

    for (const order of pendingOrders) {
      const isExpired =
        order.expiresAt !== null
          ? new Date(order.expiresAt).getTime() <= snapshot.now
          : false;

      const currentQuantity = getPositionQuantity(
        snapshot.portfolio,
        order.symbol,
      );

      const changedQuantity =
        order.side === "BUY"
          ? currentQuantity - order.baselineQuantity
          : order.baselineQuantity - currentQuantity;

      const inferred = inferStatus(order.quantity, changedQuantity, isExpired);
      if (!inferred) {
        continue;
      }

      const resolvedAmount =
        inferred.matchedQuantity * (priceMap.get(order.symbol) ?? order.price);

      patchOrder(order.id, {
        status: inferred.status,
        matchedQuantity: inferred.matchedQuantity,
        resolvedAmount,
        updatedAt: new Date(snapshot.now).toISOString(),
        inferred: true,
      });
    }
  }, [patchOrder, pendingOrders, pollerQuery.data, queryClient]);
}
