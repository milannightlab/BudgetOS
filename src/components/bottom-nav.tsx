"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CalendarDays,
  FileText,
  LayoutDashboard,
  MoreHorizontal,
  Package,
  Settings,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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

const primaryItems: NavItem[] = [
  { href: "/", label: "Prehľad", icon: LayoutDashboard },
  { href: "/transactions", label: "Platby", icon: Wallet },
  { href: "/calendar", label: "Termíny", icon: CalendarDays },
  { href: "/documents", label: "Dokumenty", icon: FileText },
];

export function BottomNav({
  moduleNav = [],
}: {
  moduleNav?: ModuleNavItem[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const pathMatches = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);

  const moreActive =
    pathMatches("/settings") ||
    pathMatches("/items") ||
    pathMatches("/vendors") ||
    moduleNav.some((m) => pathMatches(m.href));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-[#F7F9F8]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-[#F7F9F8]/80 md:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {primaryItems.map((item) => {
          const active = pathMatches(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-5" />
                <span className="truncate px-0.5">{item.label}</span>
              </Link>
            </li>
          );
        })}
        <li>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex min-h-14 w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
                  moreActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <MoreHorizontal className="size-5" />
                Viac
              </button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="max-h-[80dvh] overflow-y-auto rounded-t-2xl"
            >
              <SheetHeader>
                <SheetTitle>Ďalšie</SheetTitle>
              </SheetHeader>
              <div className="grid gap-2 px-4 pb-6">
                {moduleNav.map((m) => {
                  const Icon = getModuleNavIcon(m.key);
                  return (
                    <Button
                      key={m.key}
                      variant="outline"
                      className="justify-start gap-2"
                      asChild
                    >
                      <Link href={m.href} onClick={() => setOpen(false)}>
                        <Icon className="size-4" />
                        {m.label}
                      </Link>
                    </Button>
                  );
                })}
                <p className="pt-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Globálne
                </p>
                <Button
                  variant="outline"
                  className="justify-start gap-2"
                  asChild
                >
                  <Link href="/vendors" onClick={() => setOpen(false)}>
                    <Building2 className="size-4" />
                    Dodávatelia
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start gap-2"
                  asChild
                >
                  <Link href="/items" onClick={() => setOpen(false)}>
                    <Package className="size-4" />
                    Položky
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start gap-2"
                  asChild
                >
                  <Link href="/settings" onClick={() => setOpen(false)}>
                    <Settings className="size-4" />
                    Nastavenia
                  </Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </li>
      </ul>
    </nav>
  );
}
