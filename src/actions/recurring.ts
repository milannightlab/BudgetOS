"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { recurringPayments } from "@/db/schema";
import { ensureDbUser } from "@/lib/auth";
import { createId } from "@/lib/id";
import { expandRecurringPayments } from "@/lib/recurring";
import { requireWorkspaceAccess } from "@/lib/workspace";

const recurringSchema = z.object({
  workspaceId: z.string().min(1),
  categoryId: z.string().min(1),
  title: z.string().trim().min(1).max(120),
  amount: z.coerce.number().positive(),
  type: z.enum(["income", "expense"]).default("expense"),
  frequency: z.enum(["weekly", "monthly", "yearly"]),
  nextDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function createRecurringAction(formData: FormData) {
  const parsed = recurringSchema.parse({
    workspaceId: formData.get("workspaceId"),
    categoryId: formData.get("categoryId"),
    title: formData.get("title"),
    amount: formData.get("amount"),
    type: formData.get("type") || "expense",
    frequency: formData.get("frequency"),
    nextDueDate: formData.get("nextDueDate"),
  });

  const user = await ensureDbUser();
  await requireWorkspaceAccess(parsed.workspaceId, user.id);

  await db.insert(recurringPayments).values({
    id: createId("rec"),
    workspaceId: parsed.workspaceId,
    categoryId: parsed.categoryId,
    title: parsed.title,
    amount: parsed.amount.toFixed(2),
    type: parsed.type,
    frequency: parsed.frequency,
    nextDueDate: parsed.nextDueDate,
    createdByUserId: user.id,
  });

  await expandRecurringPayments();

  revalidatePath("/planned");
  revalidatePath("/");
  revalidatePath("/transactions");
}

export async function toggleRecurringAction(
  id: string,
  workspaceId: string,
  active: boolean,
) {
  const user = await ensureDbUser();
  await requireWorkspaceAccess(workspaceId, user.id);

  await db
    .update(recurringPayments)
    .set({ active })
    .where(
      and(
        eq(recurringPayments.id, id),
        eq(recurringPayments.workspaceId, workspaceId),
      ),
    );

  revalidatePath("/planned");
}

export async function deleteRecurringAction(id: string, workspaceId: string) {
  const user = await ensureDbUser();
  await requireWorkspaceAccess(workspaceId, user.id);

  await db
    .delete(recurringPayments)
    .where(
      and(
        eq(recurringPayments.id, id),
        eq(recurringPayments.workspaceId, workspaceId),
      ),
    );

  revalidatePath("/planned");
  revalidatePath("/");
}
