"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { ensureDbUser } from "@/lib/auth";
import { createId } from "@/lib/id";
import { requireWorkspaceAccess } from "@/lib/workspace";

export async function createCategoryAction(formData: FormData) {
  const workspaceId = z.string().parse(formData.get("workspaceId"));
  const name = z.string().trim().min(1).max(60).parse(formData.get("name"));
  const icon = z.string().trim().min(1).max(40).parse(formData.get("icon") || "circle");
  const color = z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .parse(formData.get("color") || "#64748b");

  const user = await ensureDbUser();
  await requireWorkspaceAccess(workspaceId, user.id);

  await db.insert(categories).values({
    id: createId("cat"),
    workspaceId,
    name,
    icon,
    color,
    isDefault: false,
  });

  revalidatePath("/settings");
  revalidatePath("/transactions");
  revalidatePath("/budgets");
}

export async function renameCategoryAction(formData: FormData) {
  const id = z.string().parse(formData.get("id"));
  const workspaceId = z.string().parse(formData.get("workspaceId"));
  const name = z.string().trim().min(1).max(60).parse(formData.get("name"));

  const user = await ensureDbUser();
  await requireWorkspaceAccess(workspaceId, user.id);

  await db
    .update(categories)
    .set({ name })
    .where(and(eq(categories.id, id), eq(categories.workspaceId, workspaceId)));

  revalidatePath("/settings");
  revalidatePath("/transactions");
  revalidatePath("/budgets");
  revalidatePath("/reports");
}

export async function archiveCategoryAction(id: string, workspaceId: string) {
  const user = await ensureDbUser();
  await requireWorkspaceAccess(workspaceId, user.id);

  const category = await db.query.categories.findFirst({
    where: and(eq(categories.id, id), eq(categories.workspaceId, workspaceId)),
  });
  if (!category) throw new Error("Kategória neexistuje");
  if (category.isDefault) {
    throw new Error("Predvolené kategórie nie je možné archivovať");
  }

  await db
    .update(categories)
    .set({ archived: true })
    .where(eq(categories.id, id));

  revalidatePath("/settings");
  revalidatePath("/transactions");
  revalidatePath("/budgets");
}
