import type { OrderStatus } from "@/lib/types";

export const TERMINAL_ORDER_STATUSES: OrderStatus[] = [
  "SUCCESS",
  "FAILED",
  "EXPIRED",
  "PARTIAL_EXPIRED",
  "PAYMENT_FAILURE",
  "PARTIAL_FILLED_PAYMENT_FAILURE",
  "PARTIAL_FILLED",
];

export function isPendingOrder(status: OrderStatus): boolean {
  return status === "PENDING" || status === "CREATED";
}

export function getOrderStatusStyle(
  status: OrderStatus,
): "success" | "warning" | "danger" | "info" | "orange" | "secondary" {
  switch (status) {
    case "SUCCESS":
      return "success";
    case "PENDING":
    case "CREATED":
      return "warning";
    case "PARTIAL_FILLED":
      return "info";
    case "PAYMENT_FAILURE":
    case "PARTIAL_FILLED_PAYMENT_FAILURE":
      return "orange";
    case "FAILED":
    case "EXPIRED":
    case "PARTIAL_EXPIRED":
      return "danger";
    default:
      return "secondary";
  }
}
