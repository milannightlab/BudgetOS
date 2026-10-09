"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { itemRelations, items } from "@/db/schema";
import { ensureDbUser } from "@/lib/auth";
import { createId } from "@/lib/id";
import { requireWorkspaceAccess } from "@/lib/workspace";
import { canRelateItems } from "@/modules/item-types";

export async function createItemRelationAction(formData: FormData) {
  const workspaceId = z.string().parse(formData.get("workspaceId"));
  const sourceItemId = z.string().parse(formData.get("sourceItemId"));
  const targetItemId = z.string().parse(formData.get("targetItemId"));
  const relationType = z
    .string()
    .default("related_to")
    .parse(formData.get("relationType") || "related_to");

  if (!canRelateItems(sourceItemId, targetItemId)) {
    throw new Error("Neplatný vzťah medzi položkami");
  }

  const user = await ensureDbUser();
  await requireWorkspaceAccess(workspaceId, user.id);

  const [source, target] = await Promise.all([
    db.query.items.findFirst({
      where: and(eq(items.id, sourceItemId), eq(items.workspaceId, workspaceId)),
    }),
    db.query.items.findFirst({
      where: and(eq(items.id, targetItemId), eq(items.workspaceId, workspaceId)),
    }),
  ]);

  if (!source || !target) {
    throw new Error("Položky musia patriť do rovnakého workspace");
  }

  try {
    await db.insert(itemRelations).values({
      id: createId("irl"),
      workspaceId,
      sourceItemId,
      targetItemId,
      relationType,
    });
  } catch {
    // duplicate unique
  }

  revalidatePath(`/items/${sourceItemId}`);
  revalidatePath(`/items/${targetItemId}`);
  revalidatePath("/modules", "layout");
}

export async function deleteItemRelationAction(
  id: string,
  workspaceId: string,
  sourceItemId: string,
) {
  const user = await ensureDbUser();
  await requireWorkspaceAccess(workspaceId, user.id);

  await db
    .delete(itemRelations)
    .where(
      and(
        eq(itemRelations.id, id),
        eq(itemRelations.workspaceId, workspaceId),
      ),
    );

  revalidatePath(`/items/${sourceItemId}`);
  revalidatePath("/modules", "layout");
}
