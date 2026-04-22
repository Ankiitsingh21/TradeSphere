"use client";

import { Bell, LogOut, RefreshCw, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { User } from "@/lib/types";

interface TopbarProps {
  title: string;
  subtitle: string;
  user: User;
  onSignOut: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function Topbar({
  title,
  subtitle,
  user,
  onSignOut,
  onRefresh,
  isRefreshing,
}: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 mb-4 rounded-2xl border border-border/70 bg-slate-950/75 px-4 py-3 backdrop-blur md:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-lg font-semibold sm:text-xl">
            {title}
          </p>
          <p className="text-xs text-muted-foreground sm:text-sm">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="gap-1.5"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>

          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <Bell className="h-4 w-4" />
          </Button>

          <Separator
            orientation="vertical"
            className="mx-1 hidden h-6 sm:block"
          />

          <div className="hidden items-center gap-2 rounded-full border border-border/70 bg-background/40 px-3 py-1.5 sm:flex">
            <UserRound className="h-4 w-4 text-primary" />
            <span className="max-w-36 truncate text-xs font-medium text-muted-foreground">
              {user.email}
            </span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="text-rose-300 hover:text-rose-200"
            onClick={onSignOut}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
