"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { MarketsPage } from "@/components/pages/markets-page";

export default function MarketsRoutePage() {
  return <AuthGuard>{(user) => <MarketsPage user={user} />}</AuthGuard>;
}
