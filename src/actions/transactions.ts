"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { items, transactions } from "@/db/schema";
import { ensureDbUser } from "@/lib/auth";
import { createId } from "@/lib/id";
import {
  createRecurringSeries,
  deleteTransactionSeries,
  updateTransactionSeries,
  type SeriesEditScope,
} from "@/lib/recurring";
import { requireWorkspaceAccess } from "@/lib/workspace";

const transactionSchema = z.object({
  workspaceId: z.string().min(1),
  categoryId: z.string().min(1),
  moduleId: z.string().optional().nullable(),
  itemId: z.string().optional().nullable(),
  title: z.string().trim().min(1).max(120),
  amount: z.coerce.number().positive(),
  type: z.enum(["income", "expense"]),
  status: z.enum(["actual", "planned"]).default("actual"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().trim().max(500).optional().nullable(),
});

const recurringCreateSchema = z.object({
  repeat: z.boolean(),
  frequency: z.enum(["weekly", "monthly", "yearly"]).optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
});

const seriesScopeSchema = z.enum(["single", "future"]);

function revalidateFinance(itemId?: string | null) {
  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/planned");
  revalidatePath("/budgets");
  revalidatePath("/reports");
  revalidatePath("/modules", "layout");
  if (itemId) revalidatePath(`/items/${itemId}`);
}

async function resolveModuleId(
  workspaceId: string,
  itemId: string | null | undefined,
  moduleId: string | null | undefined,
) {
  if (moduleId) return moduleId;
  if (!itemId) return null;
  const item = await db.query.items.findFirst({
    where: and(eq(items.id, itemId), eq(items.workspaceId, workspaceId)),
    columns: { moduleId: true },
  });
  return item?.moduleId ?? null;
}

export async function createTransactionAction(formData: FormData) {
  const moduleRaw = formData.get("moduleId");
  const itemRaw = formData.get("itemId");
  const parsed = transactionSchema.parse({
    workspaceId: formData.get("workspaceId"),
    categoryId: formData.get("categoryId"),
    moduleId: moduleRaw ? String(moduleRaw) : null,
    itemId: itemRaw ? String(itemRaw) : null,
    title: formData.get("title"),
    amount: formData.get("amount"),
    type: formData.get("type"),
    status: formData.get("status") || "actual",
    date: formData.get("date"),
    note: formData.get("note") || null,
  });

  const repeatRaw = String(formData.get("repeat") ?? "");
  const endDateRaw = formData.get("endDate");
  const recurring = recurringCreateSchema.parse({
    repeat: repeatRaw === "true" || repeatRaw === "on" || repeatRaw === "1",
    frequency: formData.get("frequency") || undefined,
    endDate: endDateRaw ? String(endDateRaw) : null,
  });

  const user = await ensureDbUser();
  await requireWorkspaceAccess(parsed.workspaceId, user.id);

  const moduleId = await resolveModuleId(
    parsed.workspaceId,
    parsed.itemId,
    parsed.moduleId,
  );

  if (recurring.repeat) {
    if (!recurring.frequency) {
      throw new Error("Frequency is required for recurring payments");
    }
    if (recurring.endDate && recurring.endDate < parsed.date) {
      throw new Error("End date must be on or after the first payment date");
    }

    await createRecurringSeries({
      workspaceId: parsed.workspaceId,
      categoryId: parsed.categoryId,
      moduleId,
      itemId: parsed.itemId || null,
      title: parsed.title,
      amount: parsed.amount.toFixed(2),
      type: parsed.type,
      frequency: recurring.frequency,
      startDate: parsed.date,
      endDate: recurring.endDate,
      note: parsed.note,
      createdByUserId: user.id,
      firstStatus: parsed.status,
    });
  } else {
    await db.insert(transactions).values({
      id: createId("txn"),
      workspaceId: parsed.workspaceId,
      categoryId: parsed.categoryId,
      moduleId,
      itemId: parsed.itemId || null,
      createdByUserId: user.id,
      title: parsed.title,
      amount: parsed.amount.toFixed(2),
      type: parsed.type,
      status: parsed.status,
      date: parsed.date,
      note: parsed.note,
    });
  }

  revalidateFinance(parsed.itemId);
}

export async function updateTransactionAction(formData: FormData) {
  const id = z.string().parse(formData.get("id"));
  const moduleRaw = formData.get("moduleId");
  const itemRaw = formData.get("itemId");
  const parsed = transactionSchema.parse({
    workspaceId: formData.get("workspaceId"),
    categoryId: formData.get("categoryId"),
    moduleId: moduleRaw ? String(moduleRaw) : null,
    itemId: itemRaw ? String(itemRaw) : null,
    title: formData.get("title"),
    amount: formData.get("amount"),
    type: formData.get("type"),
    status: formData.get("status") || "actual",
    date: formData.get("date"),
    note: formData.get("note") || null,
  });

  const scope = seriesScopeSchema.parse(
    formData.get("seriesScope") || "single",
  ) as SeriesEditScope;

  const frequencyRaw = formData.get("frequency");
  const endDateRaw = formData.get("endDate");

  const user = await ensureDbUser();
  await requireWorkspaceAccess(parsed.workspaceId, user.id);

  const moduleId = await resolveModuleId(
    parsed.workspaceId,
    parsed.itemId,
    parsed.moduleId,
  );

  await updateTransactionSeries({
    transactionId: id,
    workspaceId: parsed.workspaceId,
    scope,
    fields: {
      title: parsed.title,
      amount: parsed.amount.toFixed(2),
      type: parsed.type,
      categoryId: parsed.categoryId,
      moduleId,
      itemId: parsed.itemId || null,
      note: parsed.note,
      status: parsed.status,
      date: parsed.date,
      frequency:
        frequencyRaw === "weekly" ||
        frequencyRaw === "monthly" ||
        frequencyRaw === "yearly"
          ? frequencyRaw
          : undefined,
      endDate: endDateRaw ? String(endDateRaw) : endDateRaw === "" ? null : undefined,
    },
  });

  revalidateFinance(parsed.itemId);
}

export async function markTransactionActualAction(id: string, workspaceId: string) {
  return setTransactionStatusAction(id, workspaceId, "actual");
}

export async function setTransactionStatusAction(
  id: string,
  workspaceId: string,
  status: "planned" | "actual",
) {
  const user = await ensureDbUser();
  await requireWorkspaceAccess(workspaceId, user.id);

  await db
    .update(transactions)
    .set({ status })
    .where(
      and(eq(transactions.id, id), eq(transactions.workspaceId, workspaceId)),
    );

  revalidateFinance();
}

export async function deleteTransactionAction(
  id: string,
  workspaceId: string,
  seriesScope: SeriesEditScope = "single",
) {
  const user = await ensureDbUser();
  await requireWorkspaceAccess(workspaceId, user.id);

  await deleteTransactionSeries({
    transactionId: id,
    workspaceId,
    scope: seriesScope,
  });

  revalidateFinance();
}
