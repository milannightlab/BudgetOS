"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { ensureDbUser } from "@/lib/auth";
import { createId } from "@/lib/id";
import { requireWorkspaceAccess } from "@/lib/workspace";

const transactionSchema = z.object({
  workspaceId: z.string().min(1),
  categoryId: z.string().min(1),
  title: z.string().trim().min(1).max(120),
  amount: z.coerce.number().positive(),
  type: z.enum(["income", "expense"]),
  status: z.enum(["actual", "planned"]).default("actual"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().trim().max(500).optional().nullable(),
});

export async function createTransactionAction(formData: FormData) {
  const parsed = transactionSchema.parse({
    workspaceId: formData.get("workspaceId"),
    categoryId: formData.get("categoryId"),
    title: formData.get("title"),
    amount: formData.get("amount"),
    type: formData.get("type"),
    status: formData.get("status") || "actual",
    date: formData.get("date"),
    note: formData.get("note") || null,
  });

  const user = await ensureDbUser();
  await requireWorkspaceAccess(parsed.workspaceId, user.id);

  await db.insert(transactions).values({
    id: createId("txn"),
    workspaceId: parsed.workspaceId,
    categoryId: parsed.categoryId,
    createdByUserId: user.id,
    title: parsed.title,
    amount: parsed.amount.toFixed(2),
    type: parsed.type,
    status: parsed.status,
    date: parsed.date,
    note: parsed.note,
  });

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/planned");
  revalidatePath("/budgets");
  revalidatePath("/reports");
}

export async function updateTransactionAction(formData: FormData) {
  const id = z.string().parse(formData.get("id"));
  const parsed = transactionSchema.parse({
    workspaceId: formData.get("workspaceId"),
    categoryId: formData.get("categoryId"),
    title: formData.get("title"),
    amount: formData.get("amount"),
    type: formData.get("type"),
    status: formData.get("status") || "actual",
    date: formData.get("date"),
    note: formData.get("note") || null,
  });

  const user = await ensureDbUser();
  await requireWorkspaceAccess(parsed.workspaceId, user.id);

  await db
    .update(transactions)
    .set({
      categoryId: parsed.categoryId,
      title: parsed.title,
      amount: parsed.amount.toFixed(2),
      type: parsed.type,
      status: parsed.status,
      date: parsed.date,
      note: parsed.note,
    })
    .where(
      and(
        eq(transactions.id, id),
        eq(transactions.workspaceId, parsed.workspaceId),
      ),
    );

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/planned");
  revalidatePath("/budgets");
  revalidatePath("/reports");
}

export async function markTransactionActualAction(id: string, workspaceId: string) {
  const user = await ensureDbUser();
  await requireWorkspaceAccess(workspaceId, user.id);

  await db
    .update(transactions)
    .set({ status: "actual" })
    .where(
      and(eq(transactions.id, id), eq(transactions.workspaceId, workspaceId)),
    );

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/planned");
  revalidatePath("/budgets");
  revalidatePath("/reports");
}

export async function deleteTransactionAction(id: string, workspaceId: string) {
  const user = await ensureDbUser();
  await requireWorkspaceAccess(workspaceId, user.id);

  await db
    .delete(transactions)
    .where(
      and(eq(transactions.id, id), eq(transactions.workspaceId, workspaceId)),
    );

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/planned");
  revalidatePath("/budgets");
  revalidatePath("/reports");
}
