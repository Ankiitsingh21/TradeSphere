"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import type { PortfolioRow } from "@/lib/portfolio-metrics";

interface PortfolioTableProps {
  rows: PortfolioRow[];
}

export function PortfolioTable({ rows }: PortfolioTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
        No holdings yet. Your active positions will appear here after successful
        BUY orders.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Symbol</TableHead>
          <TableHead className="text-right">Qty</TableHead>
          <TableHead className="text-right">Avg Buy Price</TableHead>
          <TableHead className="text-right">Current Price</TableHead>
          <TableHead className="text-right">P&L</TableHead>
          <TableHead className="text-right">P&L%</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const positive = row.pnl >= 0;

          return (
            <TableRow key={row.symbol}>
              <TableCell className="font-semibold tracking-wide">
                {row.symbol}
              </TableCell>
              <TableCell className="text-right font-mono text-xs">
                {formatNumber(row.quantity)}
              </TableCell>
              <TableCell className="text-right font-mono text-xs">
                {formatCurrency(row.avgBuyPrice)}
              </TableCell>
              <TableCell className="text-right font-mono text-xs">
                {formatCurrency(row.currentPrice)}
              </TableCell>
              <TableCell
                className={`text-right font-mono text-xs font-semibold ${
                  positive ? "text-emerald-300" : "text-rose-300"
                }`}
              >
                {formatCurrency(row.pnl)}
              </TableCell>
              <TableCell
                className={`text-right font-mono text-xs font-semibold ${
                  positive ? "text-emerald-300" : "text-rose-300"
                }`}
              >
                {formatPercent(row.pnlPercent)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
