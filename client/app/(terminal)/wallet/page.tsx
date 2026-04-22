"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { WalletPage } from "@/components/pages/wallet-page";

export default function WalletRoutePage() {
  return <AuthGuard>{(user) => <WalletPage user={user} />}</AuthGuard>;
}
