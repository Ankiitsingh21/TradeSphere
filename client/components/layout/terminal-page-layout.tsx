"use client";

import { SidebarNav } from "@/components/layout/sidebar-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Topbar } from "@/components/layout/topbar";
import type { User } from "@/lib/types";

interface TerminalPageLayoutProps {
  user: User;
  title: string;
  subtitle: string;
  onRefresh: () => void;
  onSignOut: () => void;
  isRefreshing?: boolean;
  children: React.ReactNode;
}

export function TerminalPageLayout({
  user,
  title,
  subtitle,
  onRefresh,
  onSignOut,
  isRefreshing,
  children,
}: TerminalPageLayoutProps) {
  return (
    <div className="relative min-h-screen pb-24 lg:pb-6">
      <div className="pointer-events-none absolute inset-0 grid-glow opacity-60" />

      <div className="relative mx-auto flex w-full max-w-[1600px] gap-4 px-3 py-4 sm:px-4 lg:gap-6 lg:px-6">
        <SidebarNav />

        <main className="min-w-0 flex-1">
          <Topbar
            title={title}
            subtitle={subtitle}
            user={user}
            onSignOut={onSignOut}
            onRefresh={onRefresh}
            isRefreshing={isRefreshing}
          />

          {children}
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
