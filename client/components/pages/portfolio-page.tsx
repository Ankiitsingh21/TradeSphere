"use client";

import { useMemo } from "react";
import { Layers3, PieChart, TrendingUp } from "lucide-react";

import { StatCard } from "@/components/common/stat-card";
import { TerminalPageLayout } from "@/components/layout/terminal-page-layout";
import { PortfolioTable } from "@/components/portfolio/portfolio-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSignOutMutation } from "@/hooks/mutations/use-sign-out";
import { usePendingOrderPoller } from "@/hooks/use-pending-order-poller";
import { useTerminalData } from "@/hooks/use-terminal-data";
import { formatCurrency, formatPercent } from "@/lib/format";
import type { User } from "@/lib/types";

export function PortfolioPage({ user }: { user: User }) {
  const { portfolioRows, portfolioMetrics, isFetching, refetchAll } =
    useTerminalData(true);

  const signOutMutation = useSignOutMutation();
  usePendingOrderPoller();

  const topExposure = useMemo(() => {
    return [...portfolioRows]
      .sort((a, b) => b.currentValue - a.currentValue)
      .slice(0, 5)
      .map((row) => ({
        symbol: row.symbol,
        currentValue: row.currentValue,
        allocation:
          portfolioMetrics.currentValue > 0
            ? (row.currentValue / portfolioMetrics.currentValue) * 100
            : 0,
      }));
  }, [portfolioMetrics.currentValue, portfolioRows]);

  return (
    <TerminalPageLayout
      user={user}
      title="Portfolio"
      subtitle="Position-level P&L tracking with live mark-to-market pricing."
      onRefresh={refetchAll}
      onSignOut={() => signOutMutation.mutate()}
      isRefreshing={isFetching}
    >
      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Positions" value={`${portfolioMetrics.positions}`} />
        <StatCard
          title="Invested Capital"
          value={formatCurrency(portfolioMetrics.totalInvested)}
        />
        <StatCard
          title="Current Value"
          value={formatCurrency(portfolioMetrics.currentValue)}
        />
        <StatCard
          title="Net P&L"
          value={formatCurrency(portfolioMetrics.totalPnl)}
          hint={formatPercent(portfolioMetrics.totalPnlPercent)}
          tone={portfolioMetrics.totalPnl >= 0 ? "positive" : "negative"}
        />
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers3 className="h-4 w-4 text-primary" />
              Holdings Table
            </CardTitle>
            <CardDescription>
              P&L and percentage returns are computed client-side per your
              formula.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PortfolioTable rows={portfolioRows} />
          </CardContent>
        </Card>

        <Card className="xl:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChart className="h-4 w-4 text-primary" />
              Exposure Mix
            </CardTitle>
            <CardDescription>
              Top holdings by current valuation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topExposure.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active positions yet.
              </p>
            ) : (
              topExposure.map((item) => (
                <div
                  key={item.symbol}
                  className="space-y-1.5 rounded-lg border border-border/60 bg-background/40 p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sm">{item.symbol}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {formatPercent(item.allocation)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-cyan-400"
                      style={{ width: `${Math.min(100, item.allocation)}%` }}
                    />
                  </div>
                  <p className="font-mono text-xs text-foreground">
                    {formatCurrency(item.currentValue)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Portfolio Signal
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {portfolioMetrics.totalPnl >= 0
              ? "Your portfolio is currently net positive. Consider protecting gains with staged exits."
              : "Your portfolio is currently negative. Review allocation and risk on underperforming positions."}
          </CardContent>
        </Card>
      </section>
    </TerminalPageLayout>
  );
}
