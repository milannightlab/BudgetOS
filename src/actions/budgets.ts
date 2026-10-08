"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { budgets } from "@/db/schema";
import { ensureDbUser } from "@/lib/auth";
import { createId } from "@/lib/id";
import { requireWorkspaceAccess } from "@/lib/workspace";

export async function upsertBudgetAction(formData: FormData) {
  const workspaceId = z.string().parse(formData.get("workspaceId"));
  const categoryId = z.string().parse(formData.get("categoryId"));
  const year = z.coerce.number().int().min(2000).max(2100).parse(formData.get("year"));
  const month = z.coerce.number().int().min(1).max(12).parse(formData.get("month"));
  const amount = z.coerce.number().nonnegative().parse(formData.get("amount"));

  const user = await ensureDbUser();
  await requireWorkspaceAccess(workspaceId, user.id);

  const existing = await db.query.budgets.findFirst({
    where: and(
      eq(budgets.workspaceId, workspaceId),
      eq(budgets.categoryId, categoryId),
      eq(budgets.year, year),
      eq(budgets.month, month),
    ),
  });

  if (existing) {
    await db
      .update(budgets)
      .set({ amount: amount.toFixed(2) })
      .where(eq(budgets.id, existing.id));
  } else {
    await db.insert(budgets).values({
      id: createId("bud"),
      workspaceId,
      categoryId,
      year,
      month,
      amount: amount.toFixed(2),
    });
  }

  revalidatePath("/budgets");
  revalidatePath("/");
  revalidatePath("/reports");
}
