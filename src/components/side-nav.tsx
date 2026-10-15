"use client";

import Link from "next/link";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import {
  Building2,
  CalendarDays,
  FileText,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import {
  getModuleNavIcon,
  type ModuleNavItem,
} from "@/lib/module-nav";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "family-os-sidenav-collapsed";

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

const settingsItem: NavItem = {
  href: "/settings",
  label: "Nastavenia",
  icon: Settings,
};

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
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "1") setCollapsed(true);
    } catch {
      // Ignore unavailable storage (private mode, etc.).
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // Ignore write failures.
      }
      return next;
    });
  }

  const moduleItems: NavItem[] = moduleNav.map((m) => ({
    href: m.href,
    label: m.label,
    icon: getModuleNavIcon(m.key),
  }));

  const allHrefs = [
    ...moduleItems.map((i) => i.href),
    ...globalItems.map((i) => i.href),
    settingsItem.href,
  ];
  const current = activeHref(pathname, allHrefs);
  const settingsActive =
    current === settingsItem.href ||
    globalItems.some((item) => current === item.href);
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <TooltipProvider delayDuration={80}>
      <aside
        className={cn(
          "relative z-40 hidden shrink-0 overflow-visible border-r border-border bg-white transition-[width] duration-200 ease-out md:block",
          collapsed ? "w-[4.5rem]" : "w-56",
        )}
      >
        <div className="sticky top-0 flex h-dvh flex-col overflow-visible p-3">
          <div
            className={cn(
              "mb-4 flex items-start gap-2",
              collapsed ? "flex-col items-center" : "px-1",
            )}
          >
            <div
              className={cn(
                "min-w-0 flex-1 overflow-hidden",
                collapsed && "sr-only",
              )}
            >
              <p className="truncate text-lg font-semibold tracking-tight">
                Family OS
              </p>
              <p className="truncate text-xs text-muted-foreground">
                Rodinný OS
              </p>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={toggleCollapsed}
                  aria-label={collapsed ? "Rozbaliť menu" : "Zbaliť menu"}
                  aria-expanded={!collapsed}
                  className="shrink-0 text-muted-foreground"
                >
                  <ToggleIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" showArrow={false}>
                {collapsed ? "Rozbaliť menu" : "Zbaliť menu"}
              </TooltipContent>
            </Tooltip>
          </div>
          <nav className="flex min-h-0 flex-1 flex-col gap-4 overflow-visible">
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
              {moduleItems.length > 0 ? (
                <NavGroup
                  items={moduleItems}
                  active={current}
                  collapsed={collapsed}
                />
              ) : null}
            </div>
            <div className="relative z-50 shrink-0 overflow-visible">
              <SettingsNavItem
                collapsed={collapsed}
                active={settingsActive}
                currentHref={current}
              />
            </div>
          </nav>
        </div>
      </aside>
    </TooltipProvider>
  );
}

function SettingsFlyoutPortal({
  anchorRef,
  open,
  children,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }

    function update() {
      const anchor = anchorRef.current;
      const menu = menuRef.current;
      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();
      const menuHeight = menu?.offsetHeight || 220;
      const gap = 8;
      const padding = 8;

      let top = rect.bottom - menuHeight;
      if (top < padding) top = padding;
      if (top + menuHeight > window.innerHeight - padding) {
        top = Math.max(padding, window.innerHeight - padding - menuHeight);
      }

      setCoords({
        top,
        left: rect.right + gap,
      });
    }

    update();
    // Second pass after menu has real height in the DOM.
    requestAnimationFrame(update);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, anchorRef]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[100]"
      style={
        coords
          ? { top: coords.top, left: coords.left }
          : { top: 0, left: 0, visibility: "hidden" }
      }
    >
      {children}
    </div>,
    document.body,
  );
}

function SettingsNavItem({
  collapsed,
  active,
  currentHref,
}: {
  collapsed: boolean;
  active: boolean;
  currentHref: string | null;
}) {
  const Icon = settingsItem.icon;
  const menuItems = [...globalItems, settingsItem];
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearCloseTimer() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function scheduleClose() {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }

  function openMenu() {
    clearCloseTimer();
    setOpen(true);
  }

  useEffect(() => () => clearCloseTimer(), []);

  return (
    <div
      ref={rootRef}
      className="relative"
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
      onFocusCapture={openMenu}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          scheduleClose();
        }
      }}
    >
      <Link
        href={settingsItem.href}
        className={cn(
          "flex items-center rounded-lg text-sm font-medium transition-colors",
          collapsed ? "justify-center px-0 py-2.5" : "gap-2 px-3 py-2",
          active
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
        aria-label={collapsed ? settingsItem.label : undefined}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Icon className="size-4 shrink-0" />
        {!collapsed ? (
          <span className="truncate">{settingsItem.label}</span>
        ) : null}
      </Link>

      <SettingsFlyoutPortal anchorRef={rootRef} open={open}>
        <div
          role="menu"
          className="min-w-40 overflow-hidden rounded-2xl bg-foreground py-1 text-background shadow-lg"
          onMouseEnter={openMenu}
          onMouseLeave={scheduleClose}
        >
          {menuItems.map((item) => {
            const isCurrent = currentHref === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                className={cn(
                  "flex w-full items-center px-3.5 py-2 text-left text-xs font-semibold tracking-wide transition-colors hover:bg-background/15",
                  isCurrent && "bg-background/15",
                )}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </SettingsFlyoutPortal>
    </div>
  );
}

function NavGroup({
  items,
  active,
  collapsed,
}: {
  items: NavItem[];
  active: string | null;
  collapsed: boolean;
}) {
  return (
    <div className="space-y-1">
      {items.map((item) => {
        const isActive = active === item.href;
        const Icon = item.icon;
        const link = (
          <Link
            href={item.href}
            className={cn(
              "flex items-center rounded-lg text-sm font-medium transition-colors",
              collapsed
                ? "justify-center px-0 py-2.5"
                : "gap-2 px-3 py-2",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            aria-label={collapsed ? item.label : undefined}
          >
            <Icon className="size-4 shrink-0" />
            {!collapsed ? (
              <span className="truncate">{item.label}</span>
            ) : null}
          </Link>
        );

        if (!collapsed) return <div key={item.href}>{link}</div>;

        return (
          <Tooltip key={item.href}>
            <TooltipTrigger asChild>{link}</TooltipTrigger>
            <TooltipContent side="right" showArrow={false}>
              {item.label}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
