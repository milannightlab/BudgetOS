"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { items, modules } from "@/db/schema";
import { ensureDbUser } from "@/lib/auth";
import { createId } from "@/lib/id";
import { requireWorkspaceAccess } from "@/lib/workspace";
import {
  getItemTypeDefinition,
  parseAttributes,
} from "@/modules/item-types";
import { isModuleSlug } from "@/modules/registry";

function revalidateItems(itemId?: string) {
  revalidatePath("/");
  revalidatePath("/modules", "layout");
  if (itemId) revalidatePath(`/items/${itemId}`);
}

const baseItemSchema = z.object({
  workspaceId: z.string().min(1),
  moduleId: z.string().min(1),
  type: z.string().min(1),
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).optional().nullable(),
  status: z.enum(["active", "inactive", "archived"]).default("active"),
  assignedMemberUserId: z.string().optional().nullable(),
});

async function resolveModuleSlug(moduleId: string, workspaceId: string) {
  const mod = await db.query.modules.findFirst({
    where: and(eq(modules.id, moduleId), eq(modules.workspaceId, workspaceId)),
  });
  if (!mod) throw new Error("Neplatný modul");
  const slug = mod.slug;
  if (!isModuleSlug(slug)) throw new Error("Neplatný modul");
  return { ...mod, slug };
}

function collectAttributesFromForm(formData: FormData) {
  const attrs: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("attr_")) continue;
    attrs[key.slice(5)] = typeof value === "string" ? value : String(value);
  }
  return attrs;
}

export async function createItemAction(formData: FormData) {
  const assignedRaw = formData.get("assignedMemberUserId");
  const parsed = baseItemSchema.parse({
    workspaceId: formData.get("workspaceId"),
    moduleId: formData.get("moduleId"),
    type: formData.get("type"),
    name: formData.get("name"),
    description: formData.get("description") || null,
    status: formData.get("status") || "active",
    assignedMemberUserId:
      assignedRaw && String(assignedRaw) !== "none"
        ? String(assignedRaw)
        : null,
  });

  const user = await ensureDbUser();
  await requireWorkspaceAccess(parsed.workspaceId, user.id);
  const mod = await resolveModuleSlug(parsed.moduleId, parsed.workspaceId);

  const typeDef = getItemTypeDefinition(mod.slug, parsed.type);
  if (!typeDef) throw new Error("Neplatný typ položky");

  const attributes = parseAttributes(
    typeDef,
    collectAttributesFromForm(formData),
  );

  const [created] = await db
    .insert(items)
    .values({
      id: createId("itm"),
      workspaceId: parsed.workspaceId,
      moduleId: parsed.moduleId,
      type: parsed.type,
      name: parsed.name,
      description: parsed.description,
      status: parsed.status,
      assignedMemberUserId: parsed.assignedMemberUserId,
      attributes,
    })
    .returning();

  revalidateItems(created.id);
  return { id: created.id };
}

export async function updateItemAction(formData: FormData) {
  const id = z.string().parse(formData.get("id"));
  const assignedRaw = formData.get("assignedMemberUserId");
  const parsed = baseItemSchema.parse({
    workspaceId: formData.get("workspaceId"),
    moduleId: formData.get("moduleId"),
    type: formData.get("type"),
    name: formData.get("name"),
    description: formData.get("description") || null,
    status: formData.get("status") || "active",
    assignedMemberUserId:
      assignedRaw && String(assignedRaw) !== "none"
        ? String(assignedRaw)
        : null,
  });

  const user = await ensureDbUser();
  await requireWorkspaceAccess(parsed.workspaceId, user.id);
  const mod = await resolveModuleSlug(parsed.moduleId, parsed.workspaceId);

  const typeDef = getItemTypeDefinition(mod.slug, parsed.type);
  if (!typeDef) throw new Error("Neplatný typ položky");

  const existing = await db.query.items.findFirst({
    where: and(eq(items.id, id), eq(items.workspaceId, parsed.workspaceId)),
  });
  if (!existing) throw new Error("Položka neexistuje");

  const fieldKeys = new Set(typeDef.fields.map((f) => f.key));
  const previous = (existing.attributes ?? {}) as Record<string, unknown>;
  const preserved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(previous)) {
    if (!fieldKeys.has(key)) preserved[key] = value;
  }

  const attributes = {
    ...preserved,
    ...parseAttributes(typeDef, collectAttributesFromForm(formData)),
  };

  await db
    .update(items)
    .set({
      moduleId: parsed.moduleId,
      type: parsed.type,
      name: parsed.name,
      description: parsed.description,
      status: parsed.status,
      assignedMemberUserId: parsed.assignedMemberUserId,
      attributes,
      updatedAt: new Date(),
    })
    .where(and(eq(items.id, id), eq(items.workspaceId, parsed.workspaceId)));

  revalidateItems(id);
}

export async function archiveItemAction(id: string, workspaceId: string) {
  const user = await ensureDbUser();
  await requireWorkspaceAccess(workspaceId, user.id);

  await db
    .update(items)
    .set({ status: "archived", updatedAt: new Date() })
    .where(and(eq(items.id, id), eq(items.workspaceId, workspaceId)));

  revalidateItems(id);
}
