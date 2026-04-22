"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  CandlestickChart,
  CircleDollarSign,
  Sparkles,
} from "lucide-react";

import { TerminalPageLayout } from "@/components/layout/terminal-page-layout";
import { OrdersTable } from "@/components/orders/orders-table";
import { StatCard } from "@/components/common/stat-card";
import { StockDetailModal } from "@/components/stocks/stock-detail-modal";
import { StocksTable } from "@/components/stocks/stocks-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSignOutMutation } from "@/hooks/mutations/use-sign-out";
import { usePendingOrderPoller } from "@/hooks/use-pending-order-poller";
import { useTerminalData } from "@/hooks/use-terminal-data";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { Stock, User } from "@/lib/types";

export function MarketsPage({ user }: { user: User }) {
  const searchParams = useSearchParams();
  const querySymbol = searchParams.get("symbol")?.toUpperCase();

  const [selectedSymbol, setSelectedSymbol] = useState<string | undefined>(
    querySymbol,
  );
  const [selectedStockForModal, setSelectedStockForModal] =
    useState<Stock | null>(null);

  const { stocks, marketSummary, orders, isFetching, refetchAll } =
    useTerminalData(true);

  const signOutMutation = useSignOutMutation();

  usePendingOrderPoller();

  const selectedStock = useMemo(
    () => stocks.find((item) => item.symbol === selectedSymbol) ?? stocks[0],
    [selectedSymbol, stocks],
  );

  return (
    <TerminalPageLayout
      user={user}
      title="Markets"
      subtitle="Live stock feed with one-click order execution controls."
      onRefresh={refetchAll}
      onSignOut={() => signOutMutation.mutate()}
      isRefreshing={isFetching}
    >
      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard title="Symbols" value={formatNumber(stocks.length)} />
        <StatCard
          title="Market Average"
          value={formatCurrency(marketSummary.averagePrice)}
          hint={`${marketSummary.unchanged} neutral momentum`}
        />
        <StatCard
          title="Gainers vs Losers"
          value={`${marketSummary.gainers} / ${marketSummary.losers}`}
          hint="Calculated from mean-price bands"
        />
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CandlestickChart className="h-4 w-4 text-primary" />
              Live Quotes
            </CardTitle>
            <CardDescription>
              Click a symbol to prefill it in the order form.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[460px] pr-2">
              <StocksTable
                stocks={stocks}
                averagePrice={marketSummary.averagePrice}
                onSelect={(stock) => setSelectedSymbol(stock.symbol)}
                onTrade={(stock) => setSelectedStockForModal(stock)}
              />
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="space-y-4 xl:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CircleDollarSign className="h-4 w-4 text-primary" />
                Selected Symbol
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedStock ? (
                <div className="space-y-2 rounded-lg border border-border/60 bg-background/40 p-3">
                  <p className="font-display text-lg">{selectedStock.symbol}</p>
                  <p className="font-mono text-sm text-emerald-300">
                    {formatCurrency(selectedStock.price)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Open the full trade modal for BUY/SELL with market or limit
                    order controls.
                  </p>

                  <Button
                    className="mt-2"
                    onClick={() => setSelectedStockForModal(selectedStock)}
                  >
                    Trade {selectedStock.symbol}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No stock selected.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                Trading Flow
              </CardTitle>
              <CardDescription>
                Use row-level Trade buttons for focused execution.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p className="rounded-lg border border-border/60 bg-background/40 p-3">
                Modal includes live feed status, price change context, and an
                integrated order panel.
              </p>
              <p className="rounded-lg border border-border/60 bg-background/40 p-3">
                If SSE disconnects, 30s polling fallback keeps prices moving.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Recent Executions
            </CardTitle>
            <CardDescription>
              Latest orders captured in your local execution tracker.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OrdersTable orders={orders.slice(0, 10)} />
          </CardContent>
        </Card>
      </section>

      <StockDetailModal
        stock={selectedStockForModal}
        onClose={() => setSelectedStockForModal(null)}
        onOrderPlaced={() => {
          refetchAll();
        }}
      />
    </TerminalPageLayout>
  );
}
