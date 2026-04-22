"use client";

import { useMemo, useState } from "react";
import { Activity, ListChecks, Search } from "lucide-react";

import { OrdersTable } from "@/components/orders/orders-table";
import { StatCard } from "@/components/common/stat-card";
import { TerminalPageLayout } from "@/components/layout/terminal-page-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSignOutMutation } from "@/hooks/mutations/use-sign-out";
import { usePendingOrderPoller } from "@/hooks/use-pending-order-poller";
import { useTerminalData } from "@/hooks/use-terminal-data";
import { filterOrdersByStatus } from "@/lib/order-metrics";
import type { User } from "@/lib/types";

type Filter = "ALL" | "PENDING" | "SUCCESS" | "FAILED";

export function OrdersPage({ user }: { user: User }) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [search, setSearch] = useState("");

  const { orders, orderMetrics, isFetching, refetchAll } =
    useTerminalData(true);
  const signOutMutation = useSignOutMutation();

  usePendingOrderPoller();

  const filteredOrders = useMemo(() => {
    const byStatus = filterOrdersByStatus(orders, filter);
    if (!search.trim()) {
      return byStatus;
    }

    const term = search.toUpperCase();
    return byStatus.filter(
      (order) =>
        order.symbol.includes(term) || order.id.toUpperCase().includes(term),
    );
  }, [filter, orders, search]);

  return (
    <TerminalPageLayout
      user={user}
      title="Orders"
      subtitle="Track order lifecycle states and execution outcomes in realtime."
      onRefresh={refetchAll}
      onSignOut={() => signOutMutation.mutate()}
      isRefreshing={isFetching}
    >
      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard title="Total Orders" value={`${orderMetrics.total}`} />
        <StatCard title="Pending" value={`${orderMetrics.pending}`} />
        <StatCard
          title="Failed"
          value={`${orderMetrics.failed}`}
          tone="negative"
        />
      </section>

      <section className="mt-4">
        <Card>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-primary" />
                Execution Ledger
              </CardTitle>
              <CardDescription>
                Status polling runs every 3 seconds for CREATED and PENDING
                orders.
              </CardDescription>
            </div>

            <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
              <div className="relative sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search symbol / order id"
                  className="pl-9"
                />
              </div>

              <Tabs
                value={filter}
                onValueChange={(value) => setFilter(value as Filter)}
              >
                <TabsList>
                  <TabsTrigger value="ALL">All</TabsTrigger>
                  <TabsTrigger value="PENDING">Pending</TabsTrigger>
                  <TabsTrigger value="SUCCESS">Success</TabsTrigger>
                  <TabsTrigger value="FAILED">Failed</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            <OrdersTable
              orders={filteredOrders}
              emptyText="No orders match current filter."
            />
          </CardContent>
        </Card>
      </section>

      <section className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" />
              Reliability Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Backend currently exposes order placement but not historical order
            read APIs. This screen remains reliable by persisting a local order
            ledger and continuously reconciling it with wallet and portfolio
            updates.
          </CardContent>
        </Card>
      </section>
    </TerminalPageLayout>
  );
}
