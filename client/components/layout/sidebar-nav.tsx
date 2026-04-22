"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bolt, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

import { NAV_ITEMS } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 lg:block">
      <div className="sticky top-5 flex h-[calc(100vh-2.5rem)] flex-col rounded-2xl border border-border/70 bg-slate-950/50 p-4">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
            <Bolt className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-base font-semibold">TradeSphere</p>
            <p className="text-xs text-muted-foreground">Execution Console</p>
          </div>
        </div>

        <div className="mt-6 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="active-sidebar-item"
                    className="absolute inset-0 rounded-xl border border-cyan-500/35 bg-cyan-500/10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                ) : null}

                <span className="relative z-10">
                  <item.icon className="h-4 w-4" />
                </span>
                <span className="relative z-10">{item.title}</span>
                {active ? (
                  <ChevronRight className="relative z-10 ml-auto h-4 w-4" />
                ) : null}
              </Link>
            );
          })}
        </div>

        <div className="mt-auto rounded-xl border border-border/60 bg-slate-900/70 p-3">
          <p className="font-display text-sm">Market latency</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Realtime stream connected
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_2px_rgba(52,211,153,0.7)]" />
            Healthy
          </div>
        </div>
      </div>
    </aside>
  );
}
