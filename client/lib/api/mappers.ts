import {
  type Order,
  type OrderSide,
  type OrderStatus,
  type PortfolioPosition,
  type Stock,
  type User,
  type WalletBalance,
} from "@/lib/types";
import { isRecord, toNumber, toStringOrEmpty } from "@/lib/utils";

const ORDER_STATUSES: OrderStatus[] = [
  "CREATED",
  "PENDING",
  "SUCCESS",
  "FAILED",
  "EXPIRED",
  "PARTIAL_EXPIRED",
  "PARTIAL_FILLED",
  "PARTIAL_FILLED_PAYMENT_FAILURE",
  "PAYMENT_FAILURE",
];

function normalizeOrderStatus(value: unknown): OrderStatus {
  if (
    typeof value === "string" &&
    ORDER_STATUSES.includes(value as OrderStatus)
  ) {
    return value as OrderStatus;
  }
  return "FAILED";
}

function normalizeOrderSide(value: unknown): OrderSide {
  if (value === "BUY" || value === "SELL") {
    return value;
  }
  return "BUY";
}

function getString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function mapUser(input: unknown): User | null {
  if (!isRecord(input)) {
    return null;
  }

  const id = getString(input.id);
  const email = getString(input.email);

  if (!id || !email) {
    return null;
  }

  return { id, email };
}

export function mapStock(input: unknown): Stock {
  if (!isRecord(input)) {
    return { id: "", symbol: "", price: 0 };
  }

  const price = toNumber(input.price);
  const previousPrice = toNumber(input.previousPrice, price);

  return {
    id: getString(input.id),
    symbol: getString(input.symbol).toUpperCase(),
    price,
    previousPrice,
    updatedAt: getString(input.updatedAt),
  };
}

export function mapPortfolioPosition(input: unknown): PortfolioPosition {
  if (!isRecord(input)) {
    return {
      userId: "",
      symbol: "",
      avgBuyPrice: 0,
      quantity: 0,
      totalInvested: 0,
    };
  }

  return {
    id: getString(input.id),
    userId: getString(input.userId),
    symbol: getString(input.symbol).toUpperCase(),
    avgBuyPrice: toNumber(input.avgBuyPrice),
    quantity: toNumber(input.quantity),
    totalInvested: toNumber(input.totalInvested),
  };
}

export function mapWalletBalance(input: unknown): WalletBalance {
  if (!isRecord(input)) {
    return {
      id: "",
      userId: "",
      totalBalance: 0,
      availableBalance: 0,
      lockedBalance: 0,
      version: 0,
    };
  }

  return {
    id: getString(input.id),
    userId: getString(input.userId),
    totalBalance: toNumber(input.total_balance ?? input.totalBalance),
    availableBalance: toNumber(
      input.available_balance ?? input.availableBalance,
    ),
    lockedBalance: toNumber(input.locked_balance ?? input.lockedBalance),
    version: toNumber(input.version),
    createdAt: getString(input.createdAt),
    updatedAt: getString(input.updatedAt),
  };
}

export function mapOrder(input: unknown): Order {
  if (!isRecord(input)) {
    return {
      id: "",
      userId: "",
      symbol: "",
      side: "BUY",
      status: "FAILED",
      quantity: 0,
      matchedQuantity: 0,
      price: 0,
      resolvedAmount: 0,
      expiresAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  const type = toStringOrEmpty(input.type).toUpperCase();
  const side = normalizeOrderSide(type || input.side);
  const status = normalizeOrderStatus(input.status);

  return {
    id: getString(input.id),
    userId: getString(input.userId),
    symbol: getString(input.symbol).toUpperCase(),
    side,
    status,
    quantity: toNumber(input.totalQuantity ?? input.quantity),
    matchedQuantity: toNumber(input.matchedQuantity),
    price: toNumber(input.price),
    resolvedAmount: toNumber(input.resolved ?? input.resolvedAmount),
    expiresAt: getString(input.expiresAt) || null,
    createdAt: getString(input.createdAt) || new Date().toISOString(),
    updatedAt: getString(input.updatedAt) || new Date().toISOString(),
  };
}
