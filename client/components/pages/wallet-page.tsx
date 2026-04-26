"use client";

import { HandCoins, ShieldCheck, WalletCards } from "lucide-react";

import { StatCard } from "@/components/common/stat-card";
import { TerminalPageLayout } from "@/components/layout/terminal-page-layout";
import { WalletActions } from "@/components/wallet/wallet-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSignOutMutation } from "@/hooks/mutations/use-sign-out";
import { useWalletMutations } from "@/hooks/mutations/use-wallet-mutations";
import { usePendingOrderPoller } from "@/hooks/use-pending-order-poller";
import { useTerminalData } from "@/hooks/use-terminal-data";
import { formatCurrency } from "@/lib/format";
import type { User } from "@/lib/types";

export function WalletPage({ user }: { user: User }) {
  const { wallet, isFetching, refetchAll } = useTerminalData(true);
  const signOutMutation = useSignOutMutation();
  const {  withdrawMoneyMutation } = useWalletMutations();

  usePendingOrderPoller();

  return (
    <TerminalPageLayout
      user={user}
      title="Wallet"
      subtitle="Manage funds used by trading orders with immediate balance updates."
      onRefresh={refetchAll}
      onSignOut={() => signOutMutation.mutate()}
      isRefreshing={isFetching}
    >
      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard
          title="Available"
          value={formatCurrency(wallet.availableBalance)}
          hint="Ready for new orders"
        />
        <StatCard
          title="Locked"
          value={formatCurrency(wallet.lockedBalance)}
          hint="Reserved by pending BUY orders"
        />
        <StatCard
          title="Total"
          value={formatCurrency(wallet.totalBalance)}
          hint="Wallet net value"
        />
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <WalletCards className="h-4 w-4 text-primary" />
                Wallet Operations
              </CardTitle>
              <CardDescription>
                Add or withdraw money instantly with server-validated updates.
              </CardDescription>
            </div>
            <WalletActions
              withdrawMoneyMutation={withdrawMoneyMutation}
            />
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="rounded-lg border border-border/60 bg-background/40 p-3">
              <p className="font-medium text-foreground">Available Balance</p>
              <p className="mt-1">
                Available balance is consumed by BUY order locks and replenished
                on settlement or release.
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/40 p-3">
              <p className="font-medium text-foreground">Locked Balance</p>
              <p className="mt-1">
                Locked funds represent currently reserved capital for pending
                executions.
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/40 p-3">
              <p className="font-medium text-foreground">Settlement</p>
              <p className="mt-1">
                Final settlements happen through backend events after trade
                engine matching.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Funds Safety
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p className="rounded-lg border border-border/60 bg-background/40 p-3">
              Cookie-based JWT auth protects wallet operations with server-side
              session verification.
            </p>
            <p className="rounded-lg border border-border/60 bg-background/40 p-3">
              Concurrent balance updates are guarded by optimistic locking in
              wallet service.
            </p>
            <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-amber-100">
              <p className="inline-flex items-center gap-2 font-medium">
                <HandCoins className="h-4 w-4" />
                Tip
              </p>
              <p className="mt-1 text-xs text-amber-100/80">
                Keep sufficient available balance before placing market BUY
                orders to avoid lock failures.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </TerminalPageLayout>
  );
}
