"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import type {
  Stock,
  StockPriceStreamUpdate,
  StockStreamStatus,
} from "@/lib/types";

const RECONNECT_DELAY_MS = 3_000;

function isValidStreamPayload(value: unknown): value is StockPriceStreamUpdate {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const payload = value as Record<string, unknown>;

  return (
    typeof payload.symbol === "string" &&
    typeof payload.price === "number" &&
    typeof payload.previousPrice === "number" &&
    typeof payload.updatedAt === "string"
  );
}

export function useStockStream() {
  const queryClient = useQueryClient();
  const reconnectTimerRef = useRef<number | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const isUnmountedRef = useRef(false);

  useEffect(() => {
    isUnmountedRef.current = false;

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const connect = () => {
      if (typeof window === "undefined" || isUnmountedRef.current) {
        return;
      }

      clearReconnectTimer();

      const source = new EventSource("/api/stocks/stream", {
        withCredentials: true,
      });

      eventSourceRef.current = source;

      source.onopen = () => {
        queryClient.setQueryData<StockStreamStatus>(
          queryKeys.stockStreamStatus,
          {
            connected: true,
            updatedAt: new Date().toISOString(),
          },
        );
      };

      source.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data) as unknown;
          if (!isValidStreamPayload(parsed)) {
            return;
          }

          queryClient.setQueryData<Stock[]>(
            queryKeys.stocks,
            (currentStocks) => {
              if (!currentStocks || currentStocks.length === 0) {
                return currentStocks;
              }

              let updated = false;

              const nextStocks = currentStocks.map((stock) => {
                if (stock.symbol !== parsed.symbol) {
                  return stock;
                }

                updated = true;

                return {
                  ...stock,
                  previousPrice: parsed.previousPrice,
                  price: parsed.price,
                  updatedAt: parsed.updatedAt,
                };
              });

              return updated ? nextStocks : currentStocks;
            },
          );
        } catch {
          return;
        }
      };

      source.onerror = () => {
        source.close();

        queryClient.setQueryData<StockStreamStatus>(
          queryKeys.stockStreamStatus,
          {
            connected: false,
            updatedAt: new Date().toISOString(),
          },
        );

        if (isUnmountedRef.current) {
          return;
        }

        clearReconnectTimer();
        reconnectTimerRef.current = window.setTimeout(() => {
          connect();
        }, RECONNECT_DELAY_MS);
      };
    };

    connect();

    return () => {
      isUnmountedRef.current = true;
      queryClient.setQueryData<StockStreamStatus>(queryKeys.stockStreamStatus, {
        connected: false,
        updatedAt: new Date().toISOString(),
      });
      clearReconnectTimer();
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [queryClient]);
}
