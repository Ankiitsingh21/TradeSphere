import type { WalletBalance } from "@/lib/types";

export const EMPTY_WALLET: WalletBalance = {
  id: "",
  userId: "",
  totalBalance: 0,
  availableBalance: 0,
  lockedBalance: 0,
  version: 0,
};
