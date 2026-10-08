"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  List,
  CalendarClock,
  PieChart,
  Wallet,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Prehľad", icon: LayoutDashboard },
  { href: "/transactions", label: "Transakcie", icon: List },
  { href: "/planned", label: "Plánované", icon: CalendarClock },
  { href: "/budgets", label: "Rozpočty", icon: Wallet },
  { href: "/reports", label: "Reporty", icon: PieChart },
  { href: "/settings", label: "Nastavenia", icon: Settings },
];

export function SideNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 border-r border-border bg-muted/30 md:block">
      <div className="sticky top-0 flex h-dvh flex-col p-4">
        <div className="mb-6 px-2">
          <p className="text-lg font-semibold tracking-tight">BudgetOS</p>
          <p className="text-xs text-muted-foreground">Rodinný rozpočet</p>
        </div>
        <nav className="space-y-1">
          {items.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
