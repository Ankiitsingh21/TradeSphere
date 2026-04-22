import { http } from "@/lib/api/http";
import { mapWalletBalance } from "@/lib/api/mappers";
import type { WalletBalance } from "@/lib/types";
import { isRecord } from "@/lib/utils";

export async function fetchWalletBalance(): Promise<WalletBalance> {
  const response = await http.get("/api/wallet/check-balance");
  const payload = response.data;

  if (!isRecord(payload)) {
    return mapWalletBalance({});
  }

  const raw = isRecord(payload.balance)
    ? payload.balance
    : isRecord(payload.data)
      ? payload.data
      : {};

  return mapWalletBalance(raw);
}

export async function addMoney(amount: number): Promise<WalletBalance> {
  const response = await http.patch("/api/wallet/add-money", { amount });
  const payload = response.data;

  if (isRecord(payload) && isRecord(payload.currntBalance)) {
    return mapWalletBalance(payload.currntBalance);
  }

  return fetchWalletBalance();
}

export async function withdrawMoney(amount: number): Promise<WalletBalance> {
  const response = await http.patch("/api/wallet/withdraw", { amount });
  const payload = response.data;

  if (isRecord(payload) && isRecord(payload.currntBalance)) {
    return mapWalletBalance(payload.currntBalance);
  }

  return fetchWalletBalance();
}
