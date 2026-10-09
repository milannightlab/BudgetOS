"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CalendarDays,
  FileText,
  Package,
  Settings,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import {
  getModuleNavIcon,
  type ModuleNavItem,
} from "@/lib/module-nav";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const globalItems: NavItem[] = [
  { href: "/transactions", label: "Platby", icon: Wallet },
  { href: "/calendar", label: "Termíny", icon: CalendarDays },
  { href: "/documents", label: "Dokumenty", icon: FileText },
  { href: "/vendors", label: "Dodávatelia", icon: Building2 },
  { href: "/items", label: "Položky", icon: Package },
];

const bottomItems: NavItem[] = [
  { href: "/settings", label: "Nastavenia", icon: Settings },
];

function pathMatches(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Only the longest matching href is active — avoids dual highlights. */
function activeHref(pathname: string, hrefs: string[]) {
  let best: string | null = null;
  for (const href of hrefs) {
    if (!pathMatches(pathname, href)) continue;
    if (!best || href.length > best.length) best = href;
  }
  return best;
}

export function SideNav({
  moduleNav = [],
}: {
  moduleNav?: ModuleNavItem[];
}) {
  const pathname = usePathname();
  const moduleItems: NavItem[] = moduleNav.map((m) => ({
    href: m.href,
    label: m.label,
    icon: getModuleNavIcon(m.key),
  }));

  const allHrefs = [
    ...globalItems.map((i) => i.href),
    ...moduleItems.map((i) => i.href),
    ...bottomItems.map((i) => i.href),
  ];
  const current = activeHref(pathname, allHrefs);

  return (
    <aside className="hidden w-56 shrink-0 border-r border-border bg-muted/30 md:block">
      <div className="sticky top-0 flex h-dvh flex-col p-4">
        <div className="mb-6 px-2">
          <p className="text-lg font-semibold tracking-tight">Family OS</p>
          <p className="text-xs text-muted-foreground">Rodinný OS</p>
        </div>
        <nav className="flex flex-1 flex-col gap-4 overflow-y-auto">
          {moduleItems.length > 0 ? (
            <NavGroup items={moduleItems} active={current} />
          ) : null}
          <div>
            <p className="mb-1 px-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Globálne
            </p>
            <NavGroup items={globalItems} active={current} />
          </div>
          <div className="mt-auto">
            <NavGroup items={bottomItems} active={current} />
          </div>
        </nav>
      </div>
    </aside>
  );
}

function NavGroup({
  items,
  active,
}: {
  items: NavItem[];
  active: string | null;
}) {
  return (
    <div className="space-y-1">
      {items.map((item) => {
        const isActive = active === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
