"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AlertTriangle, BarChart3, Clock3, Wallet } from "lucide-react";
import { motion } from "framer-motion";

import { OrderForm } from "@/components/orders/order-form";
import { OrdersTable } from "@/components/orders/orders-table";
import { PortfolioTable } from "@/components/portfolio/portfolio-table";
import { StatCard } from "@/components/common/stat-card";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Topbar } from "@/components/layout/topbar";
import { StocksTable } from "@/components/stocks/stocks-table";
import { WalletActions } from "@/components/wallet/wallet-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePlaceOrderMutation } from "@/hooks/mutations/use-place-order";
import { useSignOutMutation } from "@/hooks/mutations/use-sign-out";
import { useWalletMutations } from "@/hooks/mutations/use-wallet-mutations";
import { usePendingOrderPoller } from "@/hooks/use-pending-order-poller";
import { useTerminalData } from "@/hooks/use-terminal-data";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { getPageTitle } from "@/lib/navigation";
import { filterOrdersByStatus } from "@/lib/order-metrics";
import type { User } from "@/lib/types";

interface DashboardShellProps {
  user: User;
}

type OrderFilter = "ALL" | "PENDING" | "SUCCESS" | "FAILED";

export function DashboardShell({ user }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [orderFilter, setOrderFilter] = useState<OrderFilter>("ALL");

  const {
    wallet,
    stocks,
    portfolioRows,
    portfolioMetrics,
    marketSummary,
    orders,
    orderMetrics,
    isFetching,
    hasError,
    refetchAll,
  } = useTerminalData(true);

  const placeOrderMutation = usePlaceOrderMutation();
  const signOutMutation = useSignOutMutation();
  const { addMoneyMutation, withdrawMoneyMutation } = useWalletMutations();

  usePendingOrderPoller();

  const pageTitle = getPageTitle(pathname);

  const filteredOrders = useMemo(
    () => filterOrdersByStatus(orders, orderFilter),
    [orderFilter, orders],
  );

  const spotlightStock = stocks[0];

  return (
    <div className="relative min-h-screen pb-24 lg:pb-6">
      <div className="pointer-events-none absolute inset-0 grid-glow opacity-60" />

      <div className="relative mx-auto flex w-full max-w-[1600px] gap-4 px-3 py-4 sm:px-4 lg:gap-6 lg:px-6">
        <SidebarNav />

        <main className="min-w-0 flex-1">
          <Topbar
            title={pageTitle}
            subtitle="Live market data, wallet control, and execution state in one terminal."
            user={user}
            onSignOut={() => signOutMutation.mutate()}
            onRefresh={refetchAll}
            isRefreshing={isFetching}
          />

          {hasError ? (
            <Card className="mb-4 border-rose-500/30 bg-rose-900/20">
              <CardContent className="flex items-center gap-3 p-4 text-sm text-rose-100">
                <AlertTriangle className="h-5 w-5" />
                One or more endpoints failed. Check `sphere.dev` ingress and
                service health.
              </CardContent>
            </Card>
          ) : null}

          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4"
          >
            <StatCard
              title="Wallet Balance"
              value={formatCurrency(wallet.availableBalance)}
              hint={`${formatCurrency(wallet.lockedBalance)} locked`}
            />
            <StatCard
              title="Portfolio Value"
              value={formatCurrency(portfolioMetrics.currentValue)}
              hint={`${portfolioMetrics.positions} active positions`}
            />
            <StatCard
              title="Day P&L"
              value={formatCurrency(portfolioMetrics.totalPnl)}
              hint={formatPercent(portfolioMetrics.totalPnlPercent)}
              tone={portfolioMetrics.totalPnl >= 0 ? "positive" : "negative"}
            />
            <StatCard
              title="Orders"
              value={formatNumber(orderMetrics.total)}
              hint={`${orderMetrics.pending} pending`}
            />
          </motion.section>

          <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
            <div className="xl:col-span-4">
              <OrderForm
                stocks={stocks}
                defaultSymbol={spotlightStock?.symbol}
                onSubmit={(payload) => placeOrderMutation.mutate(payload)}
                submitting={placeOrderMutation.isPending}
              />
            </div>

            <div className="space-y-4 xl:col-span-8">
              <Card>
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-primary" />
                      Wallet Console
                    </CardTitle>
                    <CardDescription>
                      Manage funds and track balance shifts immediately after
                      executions.
                    </CardDescription>
                  </div>
                  <WalletActions
                    addMoneyMutation={addMoneyMutation}
                    withdrawMoneyMutation={withdrawMoneyMutation}
                  />
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="mt-1 font-mono text-sm">
                      {formatCurrency(wallet.totalBalance)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                    <p className="text-xs text-muted-foreground">Available</p>
                    <p className="mt-1 font-mono text-sm text-emerald-300">
                      {formatCurrency(wallet.availableBalance)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                    <p className="text-xs text-muted-foreground">Locked</p>
                    <p className="mt-1 font-mono text-sm text-amber-300">
                      {formatCurrency(wallet.lockedBalance)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Portfolio Overview
                  </CardTitle>
                  <CardDescription>
                    P&L is calculated client-side as `(currentPrice -
                    avgBuyPrice) * quantity`.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PortfolioTable rows={portfolioRows} />
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
            <Card className="xl:col-span-5">
              <CardHeader>
                <CardTitle className="font-display text-base">
                  Market Watch
                </CardTitle>
                <CardDescription>
                  {stocks.length} symbols live | Avg{" "}
                  {formatCurrency(marketSummary.averagePrice)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1.5 text-emerald-300">
                    {marketSummary.gainers} gainers
                  </div>
                  <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1.5 text-rose-300">
                    {marketSummary.losers} losers
                  </div>
                  <div className="rounded-lg border border-slate-500/30 bg-slate-500/10 px-2 py-1.5 text-slate-300">
                    {marketSummary.unchanged} mixed
                  </div>
                </div>

                <ScrollArea className="h-[320px] pr-2">
                  <StocksTable
                    stocks={stocks}
                    averagePrice={marketSummary.averagePrice}
                    onSelect={(stock) => {
                      router.push(
                        `/markets?symbol=${encodeURIComponent(stock.symbol)}`,
                      );
                    }}
                  />
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="xl:col-span-7">
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-primary" />
                    Execution Tracker
                  </CardTitle>
                  <CardDescription>
                    Pending orders are automatically re-evaluated every 3
                    seconds.
                  </CardDescription>
                </div>

                <Tabs
                  value={orderFilter}
                  onValueChange={(value) =>
                    setOrderFilter(value as OrderFilter)
                  }
                >
                  <TabsList>
                    <TabsTrigger value="ALL">All</TabsTrigger>
                    <TabsTrigger value="PENDING">Pending</TabsTrigger>
                    <TabsTrigger value="SUCCESS">Success</TabsTrigger>
                    <TabsTrigger value="FAILED">Failed</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[320px] pr-2">
                  <OrdersTable orders={filteredOrders} />
                </ScrollArea>
              </CardContent>
            </Card>
          </section>

          <div className="mt-4 rounded-xl border border-border/70 bg-slate-950/55 p-3 text-xs text-muted-foreground">
            Missing order-history endpoints in backend are handled with a
            resilient local tracker. For fully authoritative lifecycle states,
            expose a user-order list endpoint and this UI will switch to
            server-source seamlessly.
            <Link
              href="/orders"
              className="ml-1 text-primary underline-offset-2 hover:underline"
            >
              View full order panel
            </Link>
            .
          </div>
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
