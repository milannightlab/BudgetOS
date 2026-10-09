"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { modules, workspaces } from "@/db/schema";
import { ensureDbUser } from "@/lib/auth";
import {
  backfillAllWorkspaceModules,
  seedWorkspaceModules,
} from "@/lib/modules";
import {
  isModuleNavKey,
  isOverviewNavKey,
  OVERVIEW_NAV_KEY,
} from "@/lib/module-nav";
import { getUserWorkspaces, requireWorkspaceAccess } from "@/lib/workspace";
import { isModuleSlug } from "@/modules/registry";

export async function ensureModulesForCurrentUserAction() {
  const user = await ensureDbUser();
  const userWorkspaces = await getUserWorkspaces(user.id);
  for (const ws of userWorkspaces) {
    await seedWorkspaceModules(ws.id);
  }
  revalidatePath("/");
  return { count: userWorkspaces.length };
}

export async function backfillModulesAction() {
  await ensureDbUser();
  const count = await backfillAllWorkspaceModules();
  revalidatePath("/");
  return { count };
}

export async function setModuleEnabledAction(
  workspaceId: string,
  slug: string,
  enabled: boolean,
) {
  const parsedSlug = z.string().parse(slug);
  if (!isModuleSlug(parsedSlug)) {
    throw new Error("Neplatný modul");
  }

  const user = await ensureDbUser();
  await requireWorkspaceAccess(workspaceId, user.id);

  await db
    .update(modules)
    .set({ enabled })
    .where(
      and(
        eq(modules.workspaceId, workspaceId),
        eq(modules.slug, parsedSlug),
      ),
    );

  revalidatePath("/", "layout");
  revalidatePath("/settings");
  revalidatePath(`/modules/${parsedSlug}`);
}

/** Reorder Prehľad + modules. Keys are `overview` or module slugs. */
export async function reorderModulesAction(
  workspaceId: string,
  orderedKeys: string[],
) {
  const parsedWorkspaceId = z.string().min(1).parse(workspaceId);
  const keys = z.array(z.string().min(1)).min(1).parse(orderedKeys);
  if (!keys.every(isModuleNavKey)) {
    throw new Error("Neplatné poradie modulov");
  }
  if (!keys.includes(OVERVIEW_NAV_KEY)) {
    throw new Error("Prehľad musí byť súčasťou poradia");
  }

  const user = await ensureDbUser();
  await requireWorkspaceAccess(parsedWorkspaceId, user.id);

  const existing = await db.query.modules.findMany({
    where: eq(modules.workspaceId, parsedWorkspaceId),
    columns: { slug: true },
  });
  const existingSlugs = new Set(existing.map((m) => m.slug));
  const moduleKeys = keys.filter((k) => !isOverviewNavKey(k));
  if (
    moduleKeys.length !== existingSlugs.size ||
    !moduleKeys.every((s) => existingSlugs.has(s))
  ) {
    throw new Error("Neplatné poradie modulov");
  }

  await Promise.all(
    keys.map(async (key, index) => {
      if (isOverviewNavKey(key)) {
        await db
          .update(workspaces)
          .set({ overviewSortOrder: index })
          .where(eq(workspaces.id, parsedWorkspaceId));
        return;
      }
      await db
        .update(modules)
        .set({ sortOrder: index })
        .where(
          and(
            eq(modules.workspaceId, parsedWorkspaceId),
            eq(modules.slug, key),
          ),
        );
    }),
  );

  revalidatePath("/", "layout");
  revalidatePath("/settings");
}
