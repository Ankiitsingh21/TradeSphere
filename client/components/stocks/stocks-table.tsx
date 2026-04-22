"use client";

import { useMemo } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import type { Stock } from "@/lib/types";

interface StocksTableProps {
  stocks: Stock[];
  averagePrice: number;
  onSelect?: (stock: Stock) => void;
  onTrade?: (stock: Stock) => void;
}

export function StocksTable({
  stocks,
  averagePrice,
  onSelect,
  onTrade,
}: StocksTableProps) {
  const stockChangePercent = useMemo(
    () =>
      stocks.reduce<Record<string, number>>((acc, stock) => {
        const previousPrice = stock.previousPrice ?? stock.price;
        const percent =
          previousPrice > 0
            ? ((stock.price - previousPrice) / previousPrice) * 100
            : 0;
        acc[stock.symbol] = percent;
        return acc;
      }, {}),
    [stocks],
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Symbol</TableHead>
          <TableHead className="text-right">Price</TableHead>
          <TableHead className="text-right">Change</TableHead>
          <TableHead className="text-right">Signal</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {stocks.map((stock) => {
          const above = stock.price >= averagePrice;
          const changePercent = stockChangePercent[stock.symbol] ?? 0;
          const positiveChange = changePercent >= 0;

          return (
            <TableRow
              key={stock.id || stock.symbol}
              className={onSelect ? "cursor-pointer" : undefined}
              onClick={() => onSelect?.(stock)}
            >
              <TableCell className="font-semibold tracking-wide">
                {stock.symbol}
              </TableCell>
              <TableCell className="text-right font-mono text-xs">
                {formatCurrency(stock.price)}
              </TableCell>
              <TableCell
                className={`text-right font-mono text-xs font-semibold ${
                  positiveChange ? "text-emerald-300" : "text-rose-300"
                }`}
              >
                {positiveChange ? "+" : ""}
                {changePercent.toFixed(2)}%
              </TableCell>
              <TableCell className="text-right">
                <span
                  className={`inline-flex items-center gap-1 text-xs font-semibold ${
                    above ? "text-emerald-300" : "text-rose-300"
                  }`}
                >
                  {above ? (
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5" />
                  )}
                  {above ? "Momentum +" : "Momentum -"}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(event) => {
                    event.stopPropagation();
                    onTrade?.(stock);
                  }}
                >
                  Trade
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
