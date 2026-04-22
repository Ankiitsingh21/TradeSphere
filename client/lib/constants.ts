import type { OrderStatus } from "@/lib/types";

export const TERMINAL_ORDER_STATUSES = new Set<OrderStatus>([
  "SUCCESS",
  "FAILED",
  "EXPIRED",
  "PARTIAL_EXPIRED",
  "PARTIAL_FILLED",
  "PARTIAL_FILLED_PAYMENT_FAILURE",
  "PAYMENT_FAILURE",
]);

export const DEFAULT_DECIMAL_PRECISION = 2;
