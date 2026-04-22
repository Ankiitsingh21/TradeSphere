import type { OrderStatus, TrackedOrder } from "@/lib/types";

export interface OrderMetrics {
  total: number;
  pending: number;
  success: number;
  failed: number;
}

export function buildOrderMetrics(orders: TrackedOrder[]): OrderMetrics {
  return orders.reduce<OrderMetrics>(
    (acc, order) => {
      acc.total += 1;

      if (order.status === "PENDING" || order.status === "CREATED") {
        acc.pending += 1;
      }

      if (order.status === "SUCCESS" || order.status === "PARTIAL_FILLED") {
        acc.success += 1;
      }

      if (
        order.status === "FAILED" ||
        order.status === "EXPIRED" ||
        order.status === "PARTIAL_EXPIRED" ||
        order.status === "PAYMENT_FAILURE" ||
        order.status === "PARTIAL_FILLED_PAYMENT_FAILURE"
      ) {
        acc.failed += 1;
      }

      return acc;
    },
    { total: 0, pending: 0, success: 0, failed: 0 },
  );
}

export function filterOrdersByStatus(
  orders: TrackedOrder[],
  status: "ALL" | "PENDING" | "SUCCESS" | "FAILED",
): TrackedOrder[] {
  if (status === "ALL") {
    return orders;
  }

  if (status === "PENDING") {
    return orders.filter(
      (order) => order.status === "PENDING" || order.status === "CREATED",
    );
  }

  if (status === "SUCCESS") {
    return orders.filter(
      (order) =>
        order.status === "SUCCESS" || order.status === "PARTIAL_FILLED",
    );
  }

  return orders.filter((order) => {
    const statusSet: OrderStatus[] = [
      "FAILED",
      "EXPIRED",
      "PARTIAL_EXPIRED",
      "PAYMENT_FAILURE",
      "PARTIAL_FILLED_PAYMENT_FAILURE",
    ];
    return statusSet.includes(order.status);
  });
}
