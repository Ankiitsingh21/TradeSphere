"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Circle, Clock3, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { usePlaceOrderMutation } from "@/hooks/mutations/use-place-order";
import { formatCurrency, formatPercent } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import type { OrderSide, Stock, StockStreamStatus } from "@/lib/types";

interface StockDetailModalProps {
  stock: Stock | null;
  onClose: () => void;
  onOrderPlaced: () => void;
}

const DEFAULT_PRICE_SPREAD_PERCENT = 0.012;

export function StockDetailModal({
  stock,
  onClose,
  onOrderPlaced,
}: StockDetailModalProps) {
  const [side, setSide] = useState<OrderSide>("BUY");
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState("");

  const queryClient = useQueryClient();
  const placeOrderMutation = usePlaceOrderMutation();

  const open = Boolean(stock);
  const stockSymbol = stock?.symbol;
  const { data: latestStock } = useQuery({
    queryKey: [...queryKeys.stocks, stockSymbol],
    enabled: open,
    queryFn: async () => {
      const stocks = queryClient.getQueryData<Stock[]>(queryKeys.stocks) ?? [];
      return stocks.find((item) => item.symbol === stockSymbol) ?? stock;
    },
    staleTime: 0,
    gcTime: 0,
  });

  const { data: streamStatusData } = useQuery({
    queryKey: queryKeys.stockStreamStatus,
    enabled: open,
    initialData: queryClient.getQueryData<StockStreamStatus>(
      queryKeys.stockStreamStatus,
    ) ?? { connected: false, updatedAt: new Date().toISOString() },
  });

  const streamStatus = streamStatusData?.connected ?? false;

  const liveFeedConnected = streamStatus;
  const currentPrice = latestStock?.price ?? 0;
  const previousPrice = latestStock?.previousPrice ?? currentPrice;
  const change = currentPrice - previousPrice;
  const changePercent = previousPrice > 0 ? (change / previousPrice) * 100 : 0;
  const positiveChange = change >= 0;

  const stats = useMemo(() => {
    const lowEstimate = currentPrice * (1 - DEFAULT_PRICE_SPREAD_PERCENT);
    const highEstimate = currentPrice * (1 + DEFAULT_PRICE_SPREAD_PERCENT);

    return {
      low: lowEstimate,
      high: highEstimate,
      volumeEstimate: Math.max(150_000, Math.round(currentPrice * 950)),
    };
  }, [currentPrice]);

  const estimatedValue = useMemo(() => {
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      return 0;
    }

    const limitPrice = Number(price);
    const effectivePrice =
      Number.isFinite(limitPrice) && limitPrice > 0 ? limitPrice : currentPrice;

    return qty * effectivePrice;
  }, [currentPrice, price, quantity]);

  const submitOrder = () => {
    if (!stock) {
      return;
    }

    const qty = Number(quantity);
    const px = Number(price);

    if (!Number.isFinite(qty) || qty <= 0) {
      return;
    }

    placeOrderMutation.mutate(
      {
        side,
        symbol: stock.symbol,
        quantity: qty,
        ...(Number.isFinite(px) && px > 0 ? { price: px } : {}),
      },
      {
        onSuccess: () => {
          toast.success(`${side} order placed for ${stock.symbol}`);
          onOrderPlaced();
          onClose();
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => (!isOpen ? onClose() : null)}>
      <DialogContent className="h-[96vh] w-[98vw] max-w-none overflow-hidden rounded-xl border border-border/70 bg-slate-950 p-0 sm:h-[92vh] sm:w-[95vw]">
        <div className="grid h-full grid-cols-1 lg:grid-cols-2">
          <section className="border-b border-border/70 bg-slate-950/95 p-5 lg:border-b-0 lg:border-r">
            <DialogHeader className="text-left">
              <DialogTitle className="font-display text-2xl tracking-wide">
                {stock?.symbol ?? "Stock"}
              </DialogTitle>
              <DialogDescription>
                Real-time stream from `/api/stocks/stream`.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 space-y-5">
              <div>
                <p className="font-display text-4xl font-semibold text-foreground">
                  {formatCurrency(currentPrice)}
                </p>
                <p
                  className={`mt-2 inline-flex items-center gap-1.5 text-sm font-medium ${
                    positiveChange ? "text-emerald-300" : "text-rose-300"
                  }`}
                >
                  {positiveChange ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  {formatCurrency(change)} ({formatPercent(changePercent)})
                </p>
              </div>

              <div
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs ${
                  liveFeedConnected
                    ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                    : "border border-amber-500/30 bg-amber-500/10 text-amber-200"
                }`}
              >
                <Circle
                  className={`h-2.5 w-2.5 ${
                    liveFeedConnected
                      ? "animate-pulse fill-emerald-400 text-emerald-400"
                      : "fill-amber-400 text-amber-400"
                  }`}
                />
                {liveFeedConnected
                  ? "Live feed connected"
                  : "Using polling fallback"}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-border/70 bg-background/40 p-3">
                  <p className="text-xs text-muted-foreground">24h High</p>
                  <p className="mt-1 font-mono text-foreground">
                    {formatCurrency(stats.high)}
                  </p>
                </div>
                <div className="rounded-lg border border-border/70 bg-background/40 p-3">
                  <p className="text-xs text-muted-foreground">24h Low</p>
                  <p className="mt-1 font-mono text-foreground">
                    {formatCurrency(stats.low)}
                  </p>
                </div>
                <div className="rounded-lg border border-border/70 bg-background/40 p-3">
                  <p className="text-xs text-muted-foreground">Prev. Close</p>
                  <p className="mt-1 font-mono text-foreground">
                    {formatCurrency(previousPrice)}
                  </p>
                </div>
                <div className="rounded-lg border border-border/70 bg-background/40 p-3">
                  <p className="text-xs text-muted-foreground">Volume (est)</p>
                  <p className="mt-1 font-mono text-foreground">
                    {stats.volumeEstimate.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              <div className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                <Clock3 className="h-3.5 w-3.5" />
                Updated{" "}
                {latestStock?.updatedAt
                  ? new Date(latestStock.updatedAt).toLocaleTimeString("en-IN")
                  : "--"}
              </div>
            </div>
          </section>

          <section className="overflow-y-auto p-5">
            <div className="mx-auto w-full max-w-md space-y-5">
              <div className="rounded-xl border border-border/70 bg-background/35 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Trade Panel
                </p>

                <div className="mt-3 flex items-center justify-between rounded-lg border border-border/60 bg-background/35 px-3 py-2.5">
                  <span className="text-xs text-muted-foreground">SELL</span>
                  <Switch
                    aria-label="Toggle buy or sell"
                    checked={side === "BUY"}
                    onCheckedChange={(checked) =>
                      setSide(checked ? "BUY" : "SELL")
                    }
                  />
                  <span className="text-xs text-muted-foreground">BUY</span>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="modal-quantity">Quantity</Label>
                    <Input
                      id="modal-quantity"
                      type="number"
                      min={1}
                      step={1}
                      value={quantity}
                      onChange={(event) => setQuantity(event.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="modal-price">Price (optional)</Label>
                    <Input
                      id="modal-price"
                      type="number"
                      min={0}
                      step={0.01}
                      value={price}
                      onChange={(event) => setPrice(event.target.value)}
                      placeholder={`MKT (${formatCurrency(currentPrice)})`}
                    />
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-border/70 bg-background/40 p-3">
                  <p className="text-xs text-muted-foreground">
                    Estimated value
                  </p>
                  <p className="mt-1 font-mono text-xl text-foreground">
                    {formatCurrency(estimatedValue)}
                  </p>
                </div>

                <Button
                  onClick={submitOrder}
                  disabled={
                    placeOrderMutation.isPending ||
                    !stock ||
                    Number(quantity) <= 0
                  }
                  className="mt-4 w-full"
                  variant={side === "BUY" ? "default" : "secondary"}
                >
                  {placeOrderMutation.isPending
                    ? "Submitting..."
                    : `${side} ${stock?.symbol ?? "Stock"}`}
                </Button>
              </div>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
