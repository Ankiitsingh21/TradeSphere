import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Order, OrderStatus, TrackedOrder } from "@/lib/types";

const MAX_ORDERS = 150;

interface OrderStoreState {
  orders: TrackedOrder[];
  upsertOrder: (
    order: Order,
    baselineQuantity: number,
    baselineWallet: number,
  ) => void;
  patchOrder: (orderId: string, patch: Partial<TrackedOrder>) => void;
  clearOrders: () => void;
}

function sortOrders(orders: TrackedOrder[]) {
  return [...orders]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, MAX_ORDERS);
}

export const useOrderStore = create<OrderStoreState>()(
  persist(
    (set) => ({
      orders: [],
      upsertOrder: (order, baselineQuantity, baselineWallet) => {
        set((state) => {
          const existingIndex = state.orders.findIndex(
            (item) => item.id === order.id,
          );
          const tracked: TrackedOrder = {
            ...order,
            baselineQuantity,
            baselineWallet,
          };

          if (existingIndex === -1) {
            return { orders: sortOrders([tracked, ...state.orders]) };
          }

          const next = [...state.orders];
          const existing = next[existingIndex];
          next[existingIndex] = {
            ...existing,
            ...tracked,
            baselineQuantity: existing.baselineQuantity,
            baselineWallet: existing.baselineWallet,
          };

          return { orders: sortOrders(next) };
        });
      },
      patchOrder: (orderId, patch) => {
        set((state) => {
          const next = state.orders.map((order) =>
            order.id === orderId ? { ...order, ...patch } : order,
          );
          return { orders: sortOrders(next) };
        });
      },
      clearOrders: () => set({ orders: [] }),
    }),
    {
      name: "tradesphere-order-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ orders: state.orders }),
      version: 1,
      merge: (persistedState, currentState) => {
        if (
          typeof persistedState === "object" &&
          persistedState !== null &&
          "orders" in persistedState &&
          Array.isArray((persistedState as { orders: unknown }).orders)
        ) {
          const raw = (persistedState as { orders: TrackedOrder[] }).orders;
          const normalized = raw.map((order) => ({
            ...order,
            status: order.status as OrderStatus,
            baselineQuantity: Number(order.baselineQuantity ?? 0),
            baselineWallet: Number(order.baselineWallet ?? 0),
          }));

          return {
            ...currentState,
            orders: sortOrders(normalized),
          };
        }

        return currentState;
      },
    },
  ),
);
