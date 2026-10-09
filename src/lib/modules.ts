import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { modules, workspaces } from "@/db/schema";
import { createId } from "@/lib/id";
import {
  buildModuleNavItems,
  type ModuleNavItem,
} from "@/lib/module-nav";
import {
  getModuleBySlug,
  MODULES,
  type ModuleSlug,
} from "@/modules/registry";

export async function seedWorkspaceModules(workspaceId: string) {
  const existing = await db.query.modules.findMany({
    where: eq(modules.workspaceId, workspaceId),
  });
  const existingSlugs = new Set(existing.map((m) => m.slug));

  const missing = MODULES.filter((m) => !existingSlugs.has(m.slug));
  if (missing.length === 0) {
    return existing;
  }

  const maxOrder = existing.reduce(
    (max, m) => Math.max(max, m.sortOrder ?? 0),
    0,
  );

  const inserted = await db
    .insert(modules)
    .values(
      missing.map((m, index) => ({
        id: createId("mod"),
        workspaceId,
        slug: m.slug,
        enabled: m.defaultEnabled,
        sortOrder:
          existing.length === 0 ? m.order : maxOrder + index + 1,
      })),
    )
    .returning();

  return [...existing, ...inserted];
}

export async function backfillAllWorkspaceModules() {
  const allWorkspaces = await db.select({ id: workspaces.id }).from(workspaces);
  for (const ws of allWorkspaces) {
    await seedWorkspaceModules(ws.id);
  }
  return allWorkspaces.length;
}

export async function getWorkspaceModules(workspaceId: string) {
  return db.query.modules.findMany({
    where: eq(modules.workspaceId, workspaceId),
    orderBy: [asc(modules.sortOrder), asc(modules.slug)],
  });
}

export async function getEnabledWorkspaceModules(workspaceId: string) {
  const rows = await db.query.modules.findMany({
    where: and(
      eq(modules.workspaceId, workspaceId),
      eq(modules.enabled, true),
    ),
    orderBy: [asc(modules.sortOrder), asc(modules.slug)],
  });

  return rows
    .map((row) => {
      const definition = getModuleBySlug(row.slug);
      if (!definition) return null;
      return { ...row, definition };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
}

/** Module section nav: Prehľad + enabled modules in workspace order. */
export async function getModuleNavItems(
  workspaceId: string,
): Promise<ModuleNavItem[]> {
  const [workspaceRows, rows] = await Promise.all([
    db
      .select({ overviewSortOrder: workspaces.overviewSortOrder })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1),
    getWorkspaceModules(workspaceId),
  ]);

  return buildModuleNavItems({
    overviewSortOrder: workspaceRows[0]?.overviewSortOrder ?? 0,
    modules: rows,
    enabledOnly: true,
  });
}

export async function getModuleBySlugForWorkspace(
  workspaceId: string,
  slug: ModuleSlug,
) {
  return db.query.modules.findFirst({
    where: and(eq(modules.workspaceId, workspaceId), eq(modules.slug, slug)),
  });
}
