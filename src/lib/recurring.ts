import { addMonths, addWeeks, addYears, format, parseISO } from "date-fns";
import { and, eq, lte } from "drizzle-orm";
import { db } from "@/db";
import { recurringPayments, transactions } from "@/db/schema";
import { createId } from "@/lib/id";

export type Frequency = "weekly" | "monthly" | "yearly";

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

export async function expandRecurringPayments(asOf = new Date()) {
  const asOfStr = format(asOf, "yyyy-MM-dd");
  const due = await db.query.recurringPayments.findMany({
    where: and(
      eq(recurringPayments.active, true),
      lte(recurringPayments.nextDueDate, asOfStr),
    ),
  });

  let created = 0;

  for (const payment of due) {
    let nextDue = payment.nextDueDate;
    let guard = 0;

    while (nextDue <= asOfStr && guard < 36) {
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
          createdByUserId: payment.createdByUserId,
          recurringPaymentId: payment.id,
          title: payment.title,
          amount: payment.amount,
          type: payment.type,
          status: "planned",
          date: nextDue,
        });
        created += 1;
      }

      nextDue = advanceDate(nextDue, payment.frequency);
      guard += 1;
    }

    await db
      .update(recurringPayments)
      .set({ nextDueDate: nextDue })
      .where(eq(recurringPayments.id, payment.id));
  }

  return created;
}
