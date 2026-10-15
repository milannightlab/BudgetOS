import { addMonths, addWeeks, addYears, format, parseISO } from "date-fns";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { recurringPayments, transactions } from "@/db/schema";
import { createId } from "@/lib/id";

export type Frequency = "weekly" | "monthly" | "yearly";

/** How far ahead to materialize open-ended series. */
export const RECURRING_HORIZON_MONTHS = 12;
const MAX_EXPAND_STEPS = 36;

export function advanceDate(dateStr: string, frequency: Frequency): string {
  const date = parseISO(dateStr);
  const next =
    frequency === "weekly"
      ? addWeeks(date, 1)
      : frequency === "yearly"
        ? addYears(date, 1)
        : addMonths(date, 1);
  return format(next, "yyyy-MM-dd");
}

export function horizonEndDate(asOf = new Date()): string {
  return format(addMonths(asOf, RECURRING_HORIZON_MONTHS), "yyyy-MM-dd");
}

function effectiveExpandUntil(
  endDate: string | null | undefined,
  asOf: Date,
): string {
  const horizon = horizonEndDate(asOf);
  if (!endDate) return horizon;
  return endDate < horizon ? endDate : horizon;
}

export type RecurringSeriesInput = {
  workspaceId: string;
  categoryId: string;
  moduleId?: string | null;
  itemId?: string | null;
  title: string;
  amount: string;
  type: "income" | "expense";
  frequency: Frequency;
  /** First occurrence date. */
  startDate: string;
  endDate?: string | null;
  note?: string | null;
  createdByUserId: string;
  /** Status of the first occurrence only; later ones are always planned. */
  firstStatus?: "actual" | "planned";
};

/**
 * Create a recurring template + first transaction, then materialize
 * planned occurrences through endDate / horizon.
 */
export async function createRecurringSeries(input: RecurringSeriesInput) {
  const recurringId = createId("rec");
  const nextAfterFirst = advanceDate(input.startDate, input.frequency);
  const endDate = input.endDate ?? null;

  await db.insert(recurringPayments).values({
    id: recurringId,
    workspaceId: input.workspaceId,
    categoryId: input.categoryId,
    moduleId: input.moduleId ?? null,
    itemId: input.itemId ?? null,
    title: input.title,
    amount: input.amount,
    type: input.type,
    frequency: input.frequency,
    nextDueDate: nextAfterFirst,
    endDate,
    note: input.note ?? null,
    createdByUserId: input.createdByUserId,
  });

  await db.insert(transactions).values({
    id: createId("txn"),
    workspaceId: input.workspaceId,
    categoryId: input.categoryId,
    moduleId: input.moduleId ?? null,
    itemId: input.itemId ?? null,
    createdByUserId: input.createdByUserId,
    recurringPaymentId: recurringId,
    title: input.title,
    amount: input.amount,
    type: input.type,
    status: input.firstStatus ?? "planned",
    date: input.startDate,
    note: input.note ?? null,
  });

  await expandRecurringPayments();
  return recurringId;
}

export async function expandRecurringPayments(asOf = new Date()) {
  const asOfStr = format(asOf, "yyyy-MM-dd");
  const due = await db.query.recurringPayments.findMany({
    where: and(
      eq(recurringPayments.active, true),
      lte(recurringPayments.nextDueDate, horizonEndDate(asOf)),
    ),
  });

  let created = 0;

  for (const payment of due) {
    let nextDue = payment.nextDueDate;
    let guard = 0;
    const until = effectiveExpandUntil(payment.endDate, asOf);

    // Past-due catch-up uses asOf; future materialization uses horizon/end.
    const expandLimit = until > asOfStr ? until : asOfStr;

    while (nextDue <= expandLimit && guard < MAX_EXPAND_STEPS) {
      if (payment.endDate && nextDue > payment.endDate) break;

      const existing = await db.query.transactions.findFirst({
        where: and(
          eq(transactions.recurringPaymentId, payment.id),
          eq(transactions.date, nextDue),
        ),
      });

      if (!existing) {
        await db.insert(transactions).values({
          id: createId("txn"),
          workspaceId: payment.workspaceId,
          categoryId: payment.categoryId,
          moduleId: payment.moduleId,
          itemId: payment.itemId,
          createdByUserId: payment.createdByUserId,
          recurringPaymentId: payment.id,
          title: payment.title,
          amount: payment.amount,
          type: payment.type,
          status: "planned",
          date: nextDue,
          note: payment.note,
        });
        created += 1;
      }

      nextDue = advanceDate(nextDue, payment.frequency);
      guard += 1;
    }

    const finished =
      Boolean(payment.endDate) &&
      (!nextDue || nextDue > payment.endDate!);

    await db
      .update(recurringPayments)
      .set({
        nextDueDate: nextDue,
        ...(finished ? { active: false } : {}),
      })
      .where(eq(recurringPayments.id, payment.id));
  }

  return created;
}

export type SeriesEditScope = "single" | "future";

export type SeriesUpdateFields = {
  title: string;
  amount: string;
  type: "income" | "expense";
  categoryId: string;
  moduleId?: string | null;
  itemId?: string | null;
  note?: string | null;
  status?: "actual" | "planned";
  date?: string;
  frequency?: Frequency;
  endDate?: string | null;
};

/** Update one occurrence, or this + future planned + the template. */
export async function updateTransactionSeries(params: {
  transactionId: string;
  workspaceId: string;
  scope: SeriesEditScope;
  fields: SeriesUpdateFields;
}) {
  const txn = await db.query.transactions.findFirst({
    where: and(
      eq(transactions.id, params.transactionId),
      eq(transactions.workspaceId, params.workspaceId),
    ),
  });
  if (!txn) throw new Error("Transaction not found");

  if (params.scope === "single" || !txn.recurringPaymentId) {
    await db
      .update(transactions)
      .set({
        title: params.fields.title,
        amount: params.fields.amount,
        type: params.fields.type,
        categoryId: params.fields.categoryId,
        moduleId: params.fields.moduleId ?? null,
        itemId: params.fields.itemId ?? txn.itemId,
        note: params.fields.note ?? null,
        status: params.fields.status ?? txn.status,
        date: params.fields.date ?? txn.date,
      })
      .where(eq(transactions.id, txn.id));
    return;
  }

  const recurringId = txn.recurringPaymentId;
  const fromDate = params.fields.date ?? txn.date;
  /** Clear planned from the earlier of old/new date so moved dates don't leave orphans. */
  const deleteFrom = txn.date < fromDate ? txn.date : fromDate;
  const frequency = params.fields.frequency;
  const endDate =
    params.fields.endDate !== undefined ? params.fields.endDate : undefined;

  const template = await db.query.recurringPayments.findFirst({
    where: eq(recurringPayments.id, recurringId),
  });
  if (!template) throw new Error("Recurring series not found");

  const nextFrequency = frequency ?? template.frequency;
  const nextEndDate =
    endDate !== undefined ? endDate : (template.endDate ?? null);

  await db
    .update(recurringPayments)
    .set({
      title: params.fields.title,
      amount: params.fields.amount,
      type: params.fields.type,
      categoryId: params.fields.categoryId,
      moduleId: params.fields.moduleId ?? null,
      itemId: params.fields.itemId ?? template.itemId,
      note: params.fields.note ?? null,
      frequency: nextFrequency,
      endDate: nextEndDate,
      active: true,
    })
    .where(eq(recurringPayments.id, recurringId));

  // Drop future planned occurrences from this date onward, then rebuild.
  await db
    .delete(transactions)
    .where(
      and(
        eq(transactions.recurringPaymentId, recurringId),
        eq(transactions.workspaceId, params.workspaceId),
        eq(transactions.status, "planned"),
        gte(transactions.date, deleteFrom),
      ),
    );

  const stillOnDate = await db.query.transactions.findFirst({
    where: and(
      eq(transactions.recurringPaymentId, recurringId),
      eq(transactions.date, fromDate),
    ),
  });

  if (stillOnDate) {
    // Keep paid occurrence; refresh shared fields.
    await db
      .update(transactions)
      .set({
        title: params.fields.title,
        amount: params.fields.amount,
        type: params.fields.type,
        categoryId: params.fields.categoryId,
        moduleId: params.fields.moduleId ?? null,
        itemId: params.fields.itemId ?? template.itemId,
        note: params.fields.note ?? null,
      })
      .where(eq(transactions.id, stillOnDate.id));
  } else {
    await db.insert(transactions).values({
      id: createId("txn"),
      workspaceId: params.workspaceId,
      categoryId: params.fields.categoryId,
      moduleId: params.fields.moduleId ?? null,
      itemId: params.fields.itemId ?? template.itemId,
      createdByUserId: txn.createdByUserId,
      recurringPaymentId: recurringId,
      title: params.fields.title,
      amount: params.fields.amount,
      type: params.fields.type,
      status: params.fields.status ?? "planned",
      date: fromDate,
      note: params.fields.note ?? null,
    });
  }

  await db
    .update(recurringPayments)
    .set({ nextDueDate: advanceDate(fromDate, nextFrequency) })
    .where(eq(recurringPayments.id, recurringId));

  await expandRecurringPayments();
}

/** Delete one occurrence, or this + future planned (and stop the series). */
export async function deleteTransactionSeries(params: {
  transactionId: string;
  workspaceId: string;
  scope: SeriesEditScope;
}) {
  const txn = await db.query.transactions.findFirst({
    where: and(
      eq(transactions.id, params.transactionId),
      eq(transactions.workspaceId, params.workspaceId),
    ),
  });
  if (!txn) return;

  if (params.scope === "single" || !txn.recurringPaymentId) {
    await db
      .delete(transactions)
      .where(eq(transactions.id, txn.id));
    return;
  }

  const recurringId = txn.recurringPaymentId;

  await db
    .delete(transactions)
    .where(
      and(
        eq(transactions.recurringPaymentId, recurringId),
        eq(transactions.workspaceId, params.workspaceId),
        eq(transactions.status, "planned"),
        gte(transactions.date, txn.date),
      ),
    );

  // Also remove this row if it was already actual on the from-date.
  await db
    .delete(transactions)
    .where(eq(transactions.id, txn.id));

  await db
    .update(recurringPayments)
    .set({ active: false })
    .where(eq(recurringPayments.id, recurringId));
}
