import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  budgets,
  categories,
  recurringPayments,
  transactions,
  workspaceInvites,
  workspaceMembers,
} from "@/db/schema";
import { monthBounds } from "@/lib/dates";
import { toNumber } from "@/lib/money";

export async function getWorkspaceCategories(workspaceId: string) {
  return db.query.categories.findMany({
    where: and(
      eq(categories.workspaceId, workspaceId),
      eq(categories.archived, false),
    ),
    orderBy: [asc(categories.name)],
  });
}

export async function getMonthTransactions(
  workspaceId: string,
  year: number,
  month: number,
  status?: "actual" | "planned",
) {
  const { start, end } = monthBounds(year, month);
  return db.query.transactions.findMany({
    where: and(
      eq(transactions.workspaceId, workspaceId),
      gte(transactions.date, start),
      lte(transactions.date, end),
      status ? eq(transactions.status, status) : undefined,
    ),
    with: { category: true },
    orderBy: [desc(transactions.date), desc(transactions.createdAt)],
  });
}

export async function getMonthSummary(
  workspaceId: string,
  year: number,
  month: number,
) {
  const rows = await getMonthTransactions(workspaceId, year, month, "actual");
  let income = 0;
  let expense = 0;
  for (const row of rows) {
    const amount = toNumber(row.amount);
    if (row.type === "income") income += amount;
    else expense += amount;
  }
  return { income, expense, balance: income - expense, count: rows.length };
}

export async function getBudgetProgress(
  workspaceId: string,
  year: number,
  month: number,
) {
  const cats = await getWorkspaceCategories(workspaceId);
  const budgetRows = await db.query.budgets.findMany({
    where: and(
      eq(budgets.workspaceId, workspaceId),
      eq(budgets.year, year),
      eq(budgets.month, month),
    ),
  });
  const actuals = await getMonthTransactions(workspaceId, year, month, "actual");

  return cats.map((category) => {
    const budget = budgetRows.find((b) => b.categoryId === category.id);
    const spent = actuals
      .filter((t) => t.categoryId === category.id && t.type === "expense")
      .reduce((sum, t) => sum + toNumber(t.amount), 0);
    const limit = toNumber(budget?.amount);
    return {
      category,
      limit,
      spent,
      percent: limit > 0 ? Math.min(100, (spent / limit) * 100) : 0,
      over: limit > 0 && spent > limit,
    };
  });
}

export async function getUpcomingPlanned(workspaceId: string, limit = 8) {
  const today = new Date().toISOString().slice(0, 10);
  return db.query.transactions.findMany({
    where: and(
      eq(transactions.workspaceId, workspaceId),
      eq(transactions.status, "planned"),
      gte(transactions.date, today),
    ),
    with: { category: true },
    orderBy: [asc(transactions.date)],
    limit,
  });
}

export async function getRecurring(workspaceId: string) {
  return db.query.recurringPayments.findMany({
    where: eq(recurringPayments.workspaceId, workspaceId),
    with: { category: true },
    orderBy: [asc(recurringPayments.nextDueDate)],
  });
}

export async function getCategoryBreakdown(
  workspaceId: string,
  year: number,
  month: number,
) {
  const { start, end } = monthBounds(year, month);
  const rows = await db
    .select({
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      categoryColor: categories.color,
      total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .innerJoin(categories, eq(categories.id, transactions.categoryId))
    .where(
      and(
        eq(transactions.workspaceId, workspaceId),
        eq(transactions.type, "expense"),
        eq(transactions.status, "actual"),
        gte(transactions.date, start),
        lte(transactions.date, end),
      ),
    )
    .groupBy(transactions.categoryId, categories.name, categories.color);

  return rows
    .map((row) => ({
      ...row,
      total: toNumber(row.total),
    }))
    .sort((a, b) => b.total - a.total);
}

export async function getWorkspaceMembers(workspaceId: string) {
  return db.query.workspaceMembers.findMany({
    where: eq(workspaceMembers.workspaceId, workspaceId),
    with: { user: true },
  });
}

export async function getPendingInvites(workspaceId: string) {
  return db.query.workspaceInvites.findMany({
    where: and(
      eq(workspaceInvites.workspaceId, workspaceId),
      eq(workspaceInvites.status, "pending"),
    ),
    orderBy: [desc(workspaceInvites.createdAt)],
  });
}

export async function getPlannedVsActual(
  workspaceId: string,
  year: number,
  month: number,
) {
  const rows = await getMonthTransactions(workspaceId, year, month);
  let planned = 0;
  let actual = 0;
  for (const row of rows) {
    if (row.type !== "expense") continue;
    const amount = toNumber(row.amount);
    if (row.status === "planned") planned += amount;
    else actual += amount;
  }
  return { planned, actual };
}
