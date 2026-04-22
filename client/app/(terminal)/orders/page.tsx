"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { OrdersPage } from "@/components/pages/orders-page";

export default function OrdersRoutePage() {
  return <AuthGuard>{(user) => <OrdersPage user={user} />}</AuthGuard>;
}
