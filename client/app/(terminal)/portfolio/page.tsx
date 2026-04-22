"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { PortfolioPage } from "@/components/pages/portfolio-page";

export default function PortfolioRoutePage() {
  return <AuthGuard>{(user) => <PortfolioPage user={user} />}</AuthGuard>;
}
