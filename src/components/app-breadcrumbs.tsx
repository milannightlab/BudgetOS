"use client";

import {
  createContext,
  Fragment,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { ModuleNavItem } from "@/lib/module-nav";
import { cn } from "@/lib/utils";

export type Crumb = {
  label: string;
  href?: string;
};

type BreadcrumbContextValue = {
  crumbs: Crumb[] | null;
  setCrumbs: (crumbs: Crumb[] | null) => void;
};

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null);

const HOME_CRUMB: Crumb = { label: "Domov", href: "/" };

const GLOBAL_LABELS: Record<string, string> = {
  "/": "Domov",
  "/transactions": "Platby",
  "/calendar": "Termíny",
  "/documents": "Dokumenty",
  "/vendors": "Dodávatelia",
  "/items": "Položky",
  "/settings": "Nastavenia",
  "/budgets": "Rozpočty",
  "/planned": "Plánované",
  "/reports": "Reporty",
};

function withHomeCrumb(crumbs: Crumb[], pathname: string): Crumb[] {
  if (pathname === "/") {
    return [{ label: HOME_CRUMB.label }];
  }

  const rest = [...crumbs];
  while (rest.length > 0) {
    const first = rest[0];
    if (
      first.href === "/" ||
      first.label === HOME_CRUMB.label ||
      first.label === "Prehľad"
    ) {
      rest.shift();
      continue;
    }
    break;
  }

  return [{ ...HOME_CRUMB }, ...rest];
}

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [crumbs, setCrumbs] = useState<Crumb[] | null>(null);
  const value = useMemo(() => ({ crumbs, setCrumbs }), [crumbs]);
  return (
    <BreadcrumbContext.Provider value={value}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

function useBreadcrumbContext() {
  const ctx = useContext(BreadcrumbContext);
  if (!ctx) {
    throw new Error("BreadcrumbProvider is missing");
  }
  return ctx;
}

/** Set page crumbs for the desktop header trail. Clears on unmount. */
export function usePageBreadcrumbs(crumbs: Crumb[]) {
  const { setCrumbs } = useBreadcrumbContext();
  const key = crumbs.map((c) => `${c.label}:${c.href ?? ""}`).join("|");

  useLayoutEffect(() => {
    setCrumbs(crumbs);
    return () => setCrumbs(null);
    // Intentionally keyed by serialized crumbs to avoid identity churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, setCrumbs]);
}

function crumbsFromPath(
  pathname: string,
  moduleNav: ModuleNavItem[],
): Crumb[] {
  if (pathname === "/") {
    return [{ label: HOME_CRUMB.label }];
  }

  if (GLOBAL_LABELS[pathname]) {
    return [{ label: GLOBAL_LABELS[pathname] }];
  }

  const modulesSorted = [...moduleNav].sort(
    (a, b) => b.href.length - a.href.length,
  );
  const mod = modulesSorted.find(
    (m) => pathname === m.href || pathname.startsWith(`${m.href}/`),
  );
  if (mod) {
    if (pathname === mod.href) return [{ label: mod.label }];
    // Nested route — page will replace with named crumbs after hydrate.
    return [{ label: mod.label, href: mod.href }];
  }

  for (const [href, label] of Object.entries(GLOBAL_LABELS)) {
    if (href !== "/" && pathname.startsWith(`${href}/`)) {
      return [{ label, href }];
    }
  }

  return [{ label: "Family OS" }];
}

function BreadcrumbTrail({
  crumbs,
  className,
}: {
  crumbs: Crumb[];
  className?: string;
}) {
  if (crumbs.length === 0) return null;

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <Fragment key={`${crumb.label}-${index}`}>
              {index > 0 ? <BreadcrumbSeparator /> : null}
              <BreadcrumbItem>
                {isLast || !crumb.href ? (
                  <BreadcrumbPage className="truncate max-w-[14rem] sm:max-w-[20rem]">
                    {crumb.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={crumb.href} className="truncate max-w-[12rem]">
                      {crumb.label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

/** Desktop sticky-header location trail. */
export function HeaderBreadcrumbs({
  moduleNav = [],
}: {
  moduleNav?: ModuleNavItem[];
}) {
  const pathname = usePathname();
  const { crumbs } = useBreadcrumbContext();
  const fallback = useMemo(
    () => crumbsFromPath(pathname, moduleNav),
    [pathname, moduleNav],
  );
  const items = crumbs && crumbs.length > 0 ? crumbs : fallback;
  const trail = useMemo(
    () => withHomeCrumb(items, pathname),
    [items, pathname],
  );

  return (
    <BreadcrumbTrail
      crumbs={trail}
      className="hidden min-w-0 flex-1 md:block"
    />
  );
}

/**
 * Mobile-only back link derived from crumbs (parent = second-to-last with href).
 * Desktop uses the header trail instead.
 */
export function MobileBackCrumb({
  crumbs,
  className,
}: {
  crumbs: Crumb[];
  className?: string;
}) {
  usePageBreadcrumbs(crumbs);

  const parent = [...crumbs].reverse().find((c) => c.href);
  if (!parent?.href) return null;

  return (
    <Link
      href={parent.href}
      className={cn(
        "inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground md:hidden",
        className,
      )}
    >
      <ArrowLeft className="size-4" />
      Späť na {parent.label}
    </Link>
  );
}
