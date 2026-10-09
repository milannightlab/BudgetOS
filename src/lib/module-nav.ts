import type { LucideIcon } from "lucide-react";
import { LayoutDashboard } from "lucide-react";
import type { ModuleSlug } from "@/modules/registry";
import { getModuleBySlug } from "@/modules/registry";

export const OVERVIEW_NAV_KEY = "overview" as const;

export type ModuleNavKey = typeof OVERVIEW_NAV_KEY | ModuleSlug;

/** Serializable — no React components (safe across RSC → client). */
export type ModuleNavItem = {
  key: ModuleNavKey;
  href: string;
  label: string;
  /** Present for real modules; overview is always shown. */
  slug?: ModuleSlug;
};

export function isOverviewNavKey(key: string): key is typeof OVERVIEW_NAV_KEY {
  return key === OVERVIEW_NAV_KEY;
}

export function isModuleNavKey(key: string): key is ModuleNavKey {
  if (isOverviewNavKey(key)) return true;
  return Boolean(getModuleBySlug(key));
}

/** Resolve Lucide icon on the client from a nav key. */
export function getModuleNavIcon(key: ModuleNavKey): LucideIcon {
  if (isOverviewNavKey(key)) return LayoutDashboard;
  return getModuleBySlug(key)?.icon ?? LayoutDashboard;
}

type SortableModule = {
  slug: string;
  sortOrder: number;
  enabled?: boolean;
};

/** Merge Prehľad + modules into one list ordered by sortOrder. */
export function buildModuleNavItems(params: {
  overviewSortOrder: number;
  modules: SortableModule[];
  /** When true, only enabled modules (nav). When false, all modules (settings). */
  enabledOnly: boolean;
}): ModuleNavItem[] {
  type Entry = {
    key: ModuleNavKey;
    sortOrder: number;
    item: ModuleNavItem;
  };

  const entries: Entry[] = [
    {
      key: OVERVIEW_NAV_KEY,
      sortOrder: params.overviewSortOrder,
      item: {
        key: OVERVIEW_NAV_KEY,
        href: "/",
        label: "Prehľad",
      },
    },
  ];

  for (const row of params.modules) {
    if (params.enabledOnly && row.enabled === false) continue;
    const def = getModuleBySlug(row.slug);
    if (!def) continue;
    entries.push({
      key: def.slug,
      sortOrder: row.sortOrder,
      item: {
        key: def.slug,
        href: def.href,
        label: def.label,
        slug: def.slug,
      },
    });
  }

  entries.sort(
    (a, b) => a.sortOrder - b.sortOrder || a.key.localeCompare(b.key),
  );
  return entries.map((e) => e.item);
}
