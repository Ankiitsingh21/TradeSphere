import type { LucideIcon } from "lucide-react";
import {
  Activity,
  CandlestickChart,
  Layers3,
  LayoutDashboard,
  WalletCards,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Markets",
    href: "/markets",
    icon: CandlestickChart,
  },
  {
    title: "Portfolio",
    href: "/portfolio",
    icon: Layers3,
  },
  {
    title: "Orders",
    href: "/orders",
    icon: Activity,
  },
  {
    title: "Wallet",
    href: "/wallet",
    icon: WalletCards,
  },
];

export function getPageTitle(pathname: string): string {
  const item = NAV_ITEMS.find((value) => pathname === value.href);
  if (item) {
    return item.title;
  }

  const prefix = NAV_ITEMS.find((value) =>
    pathname.startsWith(`${value.href}/`),
  );
  return prefix?.title ?? "TradeSphere";
}
