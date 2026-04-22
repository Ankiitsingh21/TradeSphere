"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";

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
}

export function StocksTable({
  stocks,
  averagePrice,
  onSelect,
}: StocksTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Symbol</TableHead>
          <TableHead className="text-right">Price</TableHead>
          <TableHead className="text-right">Signal</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {stocks.map((stock) => {
          const above = stock.price >= averagePrice;

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
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
