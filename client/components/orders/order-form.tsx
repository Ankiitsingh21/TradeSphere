"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { formatCurrency } from "@/lib/format";
import type { OrderSide, Stock } from "@/lib/types";

interface OrderFormProps {
  stocks: Stock[];
  defaultSymbol?: string;
  onSubmit: (payload: {
    side: OrderSide;
    symbol: string;
    quantity: number;
    price?: number;
  }) => void;
  submitting?: boolean;
}

export function OrderForm({
  stocks,
  defaultSymbol,
  onSubmit,
  submitting,
}: OrderFormProps) {
  const [side, setSide] = useState<OrderSide>("BUY");
  const [symbol, setSymbol] = useState(
    defaultSymbol ?? stocks[0]?.symbol ?? "",
  );
  const [search, setSearch] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) {
      return stocks;
    }

    const term = search.trim().toUpperCase();
    return stocks.filter((item) => item.symbol.includes(term));
  }, [stocks, search]);

  const selectedStock = stocks.find((stock) => stock.symbol === symbol);

  const estimatedValue = useMemo(() => {
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      return 0;
    }

    const selectedPrice = Number(price);
    const effectivePrice =
      Number.isFinite(selectedPrice) && selectedPrice > 0
        ? selectedPrice
        : (selectedStock?.price ?? 0);

    return qty * effectivePrice;
  }, [price, quantity, selectedStock]);

  const submit = () => {
    const qty = Number(quantity);
    const px = Number(price);

    if (!symbol || !Number.isFinite(qty) || qty <= 0) {
      return;
    }

    onSubmit({
      side,
      symbol,
      quantity: qty,
      ...(Number.isFinite(px) && px > 0 ? { price: px } : {}),
    });
  };

  return (
    <Card className="h-full border-cyan-500/20">
      <CardHeader>
        <CardTitle>Place Order</CardTitle>
        <CardDescription>
          Use market order by keeping price empty.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 p-3">
          <div>
            <p className="text-xs text-muted-foreground">Order Side</p>
            <p className="font-display text-sm">{side}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">SELL</span>
            <Switch
              checked={side === "BUY"}
              onCheckedChange={(checked) => setSide(checked ? "BUY" : "SELL")}
            />
            <span className="text-xs text-muted-foreground">BUY</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="symbol-search" tone="muted">
            Search Symbol
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="symbol-search"
              placeholder="Find stock"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="symbol-select" tone="muted">
            Symbol
          </Label>
          <Select value={symbol} onValueChange={setSymbol}>
            <SelectTrigger id="symbol-select">
              <SelectValue placeholder="Select symbol" />
            </SelectTrigger>
            <SelectContent>
              {filtered.map((stock) => (
                <SelectItem key={stock.id || stock.symbol} value={stock.symbol}>
                  {stock.symbol}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="quantity" tone="muted">
              Quantity
            </Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              step={1}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price" tone="muted">
              Price (optional)
            </Label>
            <Input
              id="price"
              type="number"
              min={0}
              step={0.01}
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder={`MKT (${selectedStock ? formatCurrency(selectedStock.price) : "--"})`}
            />
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-background/40 p-3 text-xs text-muted-foreground">
          <p>Estimated value</p>
          <p className="mt-1 font-mono text-lg text-foreground">
            {formatCurrency(estimatedValue)}
          </p>
        </div>

        <Button
          onClick={submit}
          disabled={submitting || !symbol || Number(quantity) <= 0}
          className="w-full"
          variant={side === "BUY" ? "default" : "secondary"}
        >
          {submitting ? "Submitting..." : `${side} ${symbol || "Order"}`}
        </Button>
      </CardContent>
    </Card>
  );
}
