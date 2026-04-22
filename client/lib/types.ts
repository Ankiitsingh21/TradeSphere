export type OrderStatus =
  | "CREATED"
  | "PENDING"
  | "SUCCESS"
  | "FAILED"
  | "EXPIRED"
  | "PARTIAL_EXPIRED"
  | "PARTIAL_FILLED"
  | "PARTIAL_FILLED_PAYMENT_FAILURE"
  | "PAYMENT_FAILURE";

export type OrderSide = "BUY" | "SELL";

export interface User {
  id: string;
  email: string;
}

export interface Stock {
  id: string;
  symbol: string;
  price: number;
  previousPrice?: number;
  updatedAt?: string;
}

export interface StockPriceStreamUpdate {
  symbol: string;
  price: number;
  previousPrice: number;
  updatedAt: string;
}

export interface StockStreamStatus {
  connected: boolean;
  updatedAt: string;
}

export interface WalletBalance {
  id: string;
  userId: string;
  totalBalance: number;
  availableBalance: number;
  lockedBalance: number;
  version: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PortfolioPosition {
  id?: string;
  userId: string;
  symbol: string;
  avgBuyPrice: number;
  quantity: number;
  totalInvested: number;
}

export interface Order {
  id: string;
  userId: string;
  symbol: string;
  side: OrderSide;
  status: OrderStatus;
  quantity: number;
  matchedQuantity: number;
  price: number;
  resolvedAmount: number;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TrackedOrder extends Order {
  baselineQuantity: number;
  baselineWallet: number;
  inferred?: boolean;
}

export interface AuthPayload {
  email: string;
  password: string;
}

export interface PlaceOrderPayload {
  side: OrderSide;
  symbol: string;
  quantity: number;
  price?: number;
}

export interface WalletMutationPayload {
  amount: number;
}

export interface PollingSnapshot {
  wallet: WalletBalance;
  portfolio: PortfolioPosition[];
  now: number;
}
