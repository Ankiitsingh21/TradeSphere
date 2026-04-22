"use client";

import { ArrowDownToLine, ArrowUpToLine, Clock3 } from "lucide-react";

import { OrderStatusBadge } from "@/components/orders/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatNumber, formatTime } from "@/lib/format";
import type { TrackedOrder } from "@/lib/types";
import { shortId } from "@/lib/utils";

interface OrdersTableProps {
  orders: TrackedOrder[];
  emptyText?: string;
}

export function OrdersTable({
  orders,
  emptyText = "No orders yet. Place your first trade to start building history.",
}: OrdersTableProps) {
  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
        {emptyText}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order</TableHead>
          <TableHead>Symbol</TableHead>
          <TableHead>Side</TableHead>
          <TableHead className="text-right">Qty</TableHead>
          <TableHead className="text-right">Price</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Updated</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => {
          const isBuy = order.side === "BUY";

          return (
            <TableRow key={order.id}>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {shortId(order.id)}
              </TableCell>
              <TableCell className="font-semibold tracking-wide">
                {order.symbol}
              </TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                    isBuy ? "text-emerald-300" : "text-rose-300"
                  }`}
                >
                  {isBuy ? (
                    <ArrowDownToLine className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowUpToLine className="h-3.5 w-3.5" />
                  )}
                  {order.side}
                </span>
              </TableCell>
              <TableCell className="text-right font-mono text-xs text-muted-foreground">
                {formatNumber(order.quantity)}
              </TableCell>
              <TableCell className="text-right font-mono text-xs text-muted-foreground">
                {formatCurrency(order.price)}
              </TableCell>
              <TableCell>
                <OrderStatusBadge status={order.status} />
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3.5 w-3.5" />
                  {formatTime(order.updatedAt)}
                </span>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
