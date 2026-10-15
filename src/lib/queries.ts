import { and, asc, desc, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  budgets,
  calendarEvents,
  categories,
  documents,
  itemRelations,
  items,
  modules,
  recurringPayments,
  transactions,
  vendorCategories,
  vendors,
  workspaceInvites,
  workspaceMembers,
} from "@/db/schema";
import { blobProxyUrl } from "@/lib/blob";
import { monthBounds, nextDaysBounds } from "@/lib/dates";
import { readItemColor } from "@/lib/item-color";
import { toNumber } from "@/lib/money";
import { getModuleBySlug } from "@/modules/registry";
import type { UpcomingAgendaItem } from "@/lib/agenda-types";
import type {
  TimelineEvent,
  TimelinePayment,
} from "@/lib/timeline-types";

export type {
  TimelineEvent,
  TimelinePayment,
  TimelinePeriodData,
} from "@/lib/timeline-types";
export type { UpcomingAgendaItem } from "@/lib/agenda-types";

const EVENT_TYPE_LABEL: Record<
  "deadline" | "event" | "reminder",
  string
> = {
  deadline: "Termín",
  event: "Udalosť",
  reminder: "Pripomienka",
};

function itemImageUrl(attributes: Record<string, unknown> | null | undefined) {
  return blobProxyUrl(
    typeof attributes?.imageUrl === "string" ? attributes.imageUrl : null,
  );
}

async function resolveAgendaDisplayItems(
  workspaceId: string,
  itemIds: string[],
) {
  const uniqueIds = [...new Set(itemIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return new Map<string, UpcomingAgendaItem["item"]>();
  }

  const rows = await db.query.items.findMany({
    where: and(
      eq(items.workspaceId, workspaceId),
      inArray(items.id, uniqueIds),
    ),
  });

  const byId = new Map(rows.map((row) => [row.id, row]));
  const serviceIdsNeedingParent = rows
    .filter(
      (row) =>
        (row.type === "property_service" ||
          row.type === "household_service" ||
          row.type === "vehicle_service") &&
        !itemImageUrl(row.attributes),
    )
    .map((row) => row.id);

  const parentByService = new Map<string, string>();
  if (serviceIdsNeedingParent.length > 0) {
    const relations = await db.query.itemRelations.findMany({
      where: and(
        eq(itemRelations.workspaceId, workspaceId),
        inArray(itemRelations.sourceItemId, serviceIdsNeedingParent),
        eq(itemRelations.relationType, "belongs_to"),
      ),
    });
    for (const rel of relations) {
      parentByService.set(rel.sourceItemId, rel.targetItemId);
    }
  }

  const parentIds = [...new Set(parentByService.values())].filter(
    (id) => !byId.has(id),
  );
  if (parentIds.length > 0) {
    const parents = await db.query.items.findMany({
      where: and(
        eq(items.workspaceId, workspaceId),
        inArray(items.id, parentIds),
      ),
    });
    for (const parent of parents) {
      byId.set(parent.id, parent);
    }
  }

  const moduleIds = [
    ...new Set(
      [...byId.values()].map((row) => row.moduleId).filter(Boolean),
    ),
  ];
  const moduleSlugById = new Map<string, string>();
  if (moduleIds.length > 0) {
    const moduleRows = await db.query.modules.findMany({
      where: and(
        eq(modules.workspaceId, workspaceId),
        inArray(modules.id, moduleIds),
      ),
    });
    for (const mod of moduleRows) {
      moduleSlugById.set(mod.id, mod.slug);
    }
  }

  const vendorIds = [
    ...new Set(
      uniqueIds
        .map((id) => byId.get(id)?.vendorId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const vendorLogoById = new Map<string, string | null>();
  if (vendorIds.length > 0) {
    const vendorRows = await db.query.vendors.findMany({
      where: inArray(vendors.id, vendorIds),
    });
    for (const vendor of vendorRows) {
      vendorLogoById.set(vendor.id, blobProxyUrl(vendor.logoUrl));
    }
  }

  const result = new Map<string, UpcomingAgendaItem["item"]>();
  for (const id of uniqueIds) {
    const row = byId.get(id);
    if (!row) {
      result.set(id, null);
      continue;
    }

    const parentId = parentByService.get(id);
    const parent = parentId ? byId.get(parentId) : null;
    const display = parent ?? row;
    const imageUrl =
      itemImageUrl(row.attributes) ?? itemImageUrl(display.attributes);
    const slug = moduleSlugById.get(display.moduleId) ?? null;
    const moduleLabel = slug ? (getModuleBySlug(slug)?.label ?? null) : null;

    const color =
      readItemColor(display.attributes) ?? readItemColor(row.attributes);

    const vendorLogoUrl = row.vendorId
      ? (vendorLogoById.get(row.vendorId) ?? null)
      : null;

    const attrs = row.attributes ?? {};
    const categoryKey =
      typeof attrs.serviceType === "string"
        ? attrs.serviceType
        : typeof attrs.vehicleCategory === "string"
          ? attrs.vehicleCategory
          : typeof attrs.serviceCategory === "string"
            ? attrs.serviceCategory
            : null;

    result.set(id, {
      id: display.id,
      name: display.name,
      type: display.type,
      imageUrl,
      moduleLabel,
      moduleSlug: slug,
      color,
      vendorLogoUrl,
      categoryKey,
    });
  }

  return result;
}

async function resolveItemColors(
  workspaceId: string,
  itemIds: string[],
): Promise<Map<string, string | null>> {
  const uniqueIds = [...new Set(itemIds.filter(Boolean))];
  const result = new Map<string, string | null>();
  if (uniqueIds.length === 0) return result;

  const rows = await db.query.items.findMany({
    where: and(
      eq(items.workspaceId, workspaceId),
      inArray(items.id, uniqueIds),
    ),
  });
  const byId = new Map(rows.map((row) => [row.id, row]));

  const serviceIdsNeedingParent = rows
    .filter(
      (row) =>
        (row.type === "property_service" ||
          row.type === "household_service" ||
          row.type === "vehicle_service") &&
        !readItemColor(row.attributes),
    )
    .map((row) => row.id);

  const parentByService = new Map<string, string>();
  if (serviceIdsNeedingParent.length > 0) {
    const relations = await db.query.itemRelations.findMany({
      where: and(
        eq(itemRelations.workspaceId, workspaceId),
        inArray(itemRelations.sourceItemId, serviceIdsNeedingParent),
        eq(itemRelations.relationType, "belongs_to"),
      ),
    });
    for (const rel of relations) {
      parentByService.set(rel.sourceItemId, rel.targetItemId);
    }
  }

  const parentIds = [...new Set(parentByService.values())].filter(
    (id) => !byId.has(id),
  );
  if (parentIds.length > 0) {
    const parents = await db.query.items.findMany({
      where: and(
        eq(items.workspaceId, workspaceId),
        inArray(items.id, parentIds),
      ),
    });
    for (const parent of parents) {
      byId.set(parent.id, parent);
    }
  }

  for (const id of uniqueIds) {
    const row = byId.get(id);
    if (!row) {
      result.set(id, null);
      continue;
    }
    const own = readItemColor(row.attributes);
    if (own) {
      result.set(id, own);
      continue;
    }
    const parentId = parentByService.get(id);
    const parent = parentId ? byId.get(parentId) : null;
    result.set(id, readItemColor(parent?.attributes) ?? null);
  }

  return result;
}

/** Payments + calendar events for the overview agenda list. */
export async function getUpcomingAgenda(
  workspaceId: string,
  fromDate?: string | null,
  toDate?: string | null,
  filterItemIds?: string[],
): Promise<UpcomingAgendaItem[]> {
  if (filterItemIds && filterItemIds.length === 0) return [];

  const [paymentRows, eventRows] = await Promise.all([
    db.query.transactions.findMany({
      where: and(
        eq(transactions.workspaceId, workspaceId),
        fromDate ? gte(transactions.date, fromDate) : undefined,
        toDate ? lte(transactions.date, toDate) : undefined,
        filterItemIds ? inArray(transactions.itemId, filterItemIds) : undefined,
      ),
      with: { category: true },
      orderBy: [asc(transactions.date)],
    }),
    db.query.calendarEvents.findMany({
      where: and(
        eq(calendarEvents.workspaceId, workspaceId),
        fromDate ? gte(calendarEvents.eventDate, fromDate) : undefined,
        toDate ? lte(calendarEvents.eventDate, toDate) : undefined,
        filterItemIds
          ? inArray(calendarEvents.itemId, filterItemIds)
          : undefined,
      ),
      orderBy: [asc(calendarEvents.eventDate)],
    }),
  ]);

  const itemIds = [
    ...paymentRows.map((row) => row.itemId).filter(Boolean),
    ...eventRows.map((row) => row.itemId).filter(Boolean),
  ] as string[];
  const displayItems = await resolveAgendaDisplayItems(workspaceId, itemIds);

  const recurringIds = [
    ...new Set(
      paymentRows
        .map((row) => row.recurringPaymentId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const recurringById = new Map<
    string,
    { frequency: "weekly" | "monthly" | "yearly"; endDate: string | null }
  >();
  if (recurringIds.length > 0) {
    const recurringRows = await db.query.recurringPayments.findMany({
      where: inArray(recurringPayments.id, recurringIds),
      columns: { id: true, frequency: true, endDate: true },
    });
    for (const row of recurringRows) {
      recurringById.set(row.id, {
        frequency: row.frequency,
        endDate: row.endDate,
      });
    }
  }

  const agenda: UpcomingAgendaItem[] = [];

  for (const row of paymentRows) {
    const date = asDateOnly(row.date);
    const item = row.itemId ? (displayItems.get(row.itemId) ?? null) : null;
    const note = row.note?.trim() || null;
    const series = row.recurringPaymentId
      ? (recurringById.get(row.recurringPaymentId) ?? null)
      : null;
    agenda.push({
      id: `payment:${row.id}`,
      entityId: row.id,
      kind: "payment",
      status: row.status === "actual" ? "done" : "open",
      date,
      title: row.title,
      description: note ?? row.category.name,
      note,
      categoryName: row.category.name,
      categoryId: row.categoryId,
      amount: String(row.amount),
      amountType: row.type,
      eventType: null,
      itemId: row.itemId ?? null,
      href: item ? `/items/${item.id}` : null,
      item,
      recurringPaymentId: row.recurringPaymentId ?? null,
      recurringFrequency: series?.frequency ?? null,
      recurringEndDate: series?.endDate ?? null,
    });
  }

  for (const row of eventRows) {
    const date = asDateOnly(row.eventDate);
    const item = row.itemId ? (displayItems.get(row.itemId) ?? null) : null;
    const note = row.note?.trim() || null;
    agenda.push({
      id: `event:${row.id}`,
      entityId: row.id,
      kind: "event",
      status: row.completed ? "done" : "open",
      date,
      title: row.title,
      description: note ?? EVENT_TYPE_LABEL[row.type],
      note,
      categoryName: EVENT_TYPE_LABEL[row.type],
      categoryId: null,
      amount: null,
      amountType: null,
      eventType: row.type,
      itemId: row.itemId ?? null,
      href: item ? `/items/${item.id}` : null,
      item,
      recurringPaymentId: null,
      recurringFrequency: null,
      recurringEndDate: null,
    });
  }

  agenda.sort((a, b) => {
    if (a.status !== b.status) return a.status === "open" ? -1 : 1;
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.kind !== b.kind) return a.kind === "payment" ? -1 : 1;
    return a.title.localeCompare(b.title, "sk");
  });

  return agenda;
}

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
    with: {
      category: true,
      recurringPayment: {
        columns: { id: true, frequency: true, endDate: true },
      },
    },
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

export async function getPlannedPaymentsNextDays(
  workspaceId: string,
  days = 30,
) {
  const { start, end } = nextDaysBounds(days);
  return db.query.transactions.findMany({
    where: and(
      eq(transactions.workspaceId, workspaceId),
      eq(transactions.status, "planned"),
      gte(transactions.date, start),
      lte(transactions.date, end),
    ),
    with: { category: true },
    orderBy: [asc(transactions.date)],
  });
}

function asDateOnly(value: string | Date): string {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

/** Planned payments + calendar events for the interactive overview timeline. */
export async function getPaymentTimelineData(
  workspaceId: string,
  fromDate: string,
  toDate: string,
  itemIds?: string[],
) {
  if (itemIds && itemIds.length === 0) {
    return { payments: [] as TimelinePayment[], events: [] as TimelineEvent[] };
  }

  const [paymentRows, eventRows] = await Promise.all([
    db.query.transactions.findMany({
      where: and(
        eq(transactions.workspaceId, workspaceId),
        gte(transactions.date, fromDate),
        lte(transactions.date, toDate),
        itemIds ? inArray(transactions.itemId, itemIds) : undefined,
      ),
      with: { category: true },
      orderBy: [asc(transactions.date)],
    }),
    db.query.calendarEvents.findMany({
      where: and(
        eq(calendarEvents.workspaceId, workspaceId),
        gte(calendarEvents.eventDate, fromDate),
        lte(calendarEvents.eventDate, toDate),
        itemIds ? inArray(calendarEvents.itemId, itemIds) : undefined,
      ),
      orderBy: [asc(calendarEvents.eventDate)],
    }),
  ]);

  const itemColors = await resolveItemColors(
    workspaceId,
    paymentRows.map((row) => row.itemId).filter(Boolean) as string[],
  );

  const payments: TimelinePayment[] = paymentRows.map((row) => ({
    id: row.id,
    title: row.title,
    amount: String(row.amount),
    date: asDateOnly(row.date),
    type: row.type,
    status: row.status,
    itemId: row.itemId ?? null,
    itemColor: row.itemId ? (itemColors.get(row.itemId) ?? null) : null,
    category: {
      name: row.category.name,
      color: row.category.color,
    },
  }));

  const events: TimelineEvent[] = eventRows.map((row) => ({
    id: row.id,
    title: row.title,
    eventDate: asDateOnly(row.eventDate),
    type: row.type,
  }));

  return { payments, events };
}

export async function getUpcomingEvents(
  workspaceId: string,
  limit = 10,
  moduleId?: string | null,
) {
  const today = new Date().toISOString().slice(0, 10);
  return db.query.calendarEvents.findMany({
    where: and(
      eq(calendarEvents.workspaceId, workspaceId),
      gte(calendarEvents.eventDate, today),
      moduleId ? eq(calendarEvents.moduleId, moduleId) : undefined,
    ),
    with: { module: true },
    orderBy: [asc(calendarEvents.eventDate)],
    limit,
  });
}

export async function getModuleEvents(workspaceId: string, moduleId: string) {
  return db.query.calendarEvents.findMany({
    where: and(
      eq(calendarEvents.workspaceId, workspaceId),
      eq(calendarEvents.moduleId, moduleId),
    ),
    orderBy: [asc(calendarEvents.eventDate)],
  });
}

export async function getRecentDocuments(
  workspaceId: string,
  limit = 8,
  moduleId?: string | null,
) {
  return db.query.documents.findMany({
    where: and(
      eq(documents.workspaceId, workspaceId),
      moduleId ? eq(documents.moduleId, moduleId) : undefined,
    ),
    with: { module: true },
    orderBy: [desc(documents.createdAt)],
    limit,
  });
}

export async function getModuleDocuments(workspaceId: string, moduleId: string) {
  return db.query.documents.findMany({
    where: and(
      eq(documents.workspaceId, workspaceId),
      eq(documents.moduleId, moduleId),
    ),
    orderBy: [desc(documents.createdAt)],
  });
}

export async function getModulePayments(workspaceId: string, moduleId: string) {
  return db.query.transactions.findMany({
    where: and(
      eq(transactions.workspaceId, workspaceId),
      eq(transactions.moduleId, moduleId),
    ),
    with: { category: true },
    orderBy: [desc(transactions.date), desc(transactions.createdAt)],
  });
}

export async function getModuleItems(
  workspaceId: string,
  moduleId: string,
  opts?: { status?: "active" | "inactive" | "archived"; type?: string },
) {
  return db.query.items.findMany({
    where: and(
      eq(items.workspaceId, workspaceId),
      eq(items.moduleId, moduleId),
      opts?.status ? eq(items.status, opts.status) : undefined,
      opts?.type ? eq(items.type, opts.type) : undefined,
    ),
    with: { module: true, assignedMember: true },
    orderBy: [asc(items.sortOrder), asc(items.name)],
  });
}

export async function getItemById(workspaceId: string, itemId: string) {
  return db.query.items.findFirst({
    where: and(eq(items.id, itemId), eq(items.workspaceId, workspaceId)),
    with: { module: true, assignedMember: true, vendor: true },
  });
}

export type VendorListItem = {
  id: string;
  name: string;
  displayName: string;
  logoUrl: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  companyId: string | null;
  scope: "global" | "custom";
  categoryKeys?: string[];
};

export type VendorManageItem = VendorListItem & {
  categoryKeys: string[];
};

/** Global + workspace custom vendors, optionally filtered by category and search. */
export async function listVendorsForWorkspace(
  workspaceId: string,
  opts?: { categoryKey?: string | null; query?: string },
): Promise<VendorListItem[]> {
  const categoryKey = opts?.categoryKey?.trim() || null;
  const query = opts?.query?.trim().toLowerCase() || "";

  let vendorIdsForCategory: string[] | null = null;
  if (categoryKey) {
    const rows = await db.query.vendorCategories.findMany({
      where: eq(vendorCategories.categoryKey, categoryKey),
      columns: { vendorId: true },
    });
    vendorIdsForCategory = rows.map((r) => r.vendorId);
    if (vendorIdsForCategory.length === 0) {
      // Still allow custom vendors without category yet? Filter empty → only show
      // vendors that match category. Empty list means no category matches.
      vendorIdsForCategory = [];
    }
  }

  const rows = await db.query.vendors.findMany({
    where: and(
      eq(vendors.status, "active"),
      or(
        eq(vendors.scope, "global"),
        and(
          eq(vendors.scope, "custom"),
          eq(vendors.workspaceId, workspaceId),
        ),
      ),
      vendorIdsForCategory
        ? vendorIdsForCategory.length > 0
          ? inArray(vendors.id, vendorIdsForCategory)
          : sql`false`
        : undefined,
    ),
    orderBy: [asc(vendors.displayName)],
  });

  return rows
    .filter((v) => {
      if (!query) return true;
      return (
        v.displayName.toLowerCase().includes(query) ||
        v.name.toLowerCase().includes(query)
      );
    })
    .map((v) => ({
      id: v.id,
      name: v.name,
      displayName: v.displayName,
      logoUrl: v.logoUrl,
      website: v.website,
      email: v.email,
      phone: v.phone,
      address: v.address,
      companyId: v.companyId,
      scope: v.scope,
    }));
}

export async function getVendorById(
  vendorId: string,
  workspaceId: string,
) {
  const vendor = await db.query.vendors.findFirst({
    where: and(eq(vendors.id, vendorId), eq(vendors.status, "active")),
  });
  if (!vendor) return null;
  if (vendor.scope === "global") return vendor;
  if (vendor.workspaceId === workspaceId) return vendor;
  return null;
}

/** All active global + workspace custom vendors with category keys (management UI). */
export async function listVendorsForManagement(
  workspaceId: string,
): Promise<VendorManageItem[]> {
  const rows = await db.query.vendors.findMany({
    where: and(
      eq(vendors.status, "active"),
      or(
        eq(vendors.scope, "global"),
        and(eq(vendors.scope, "custom"), eq(vendors.workspaceId, workspaceId)),
      ),
    ),
    with: { categoryLinks: true },
    orderBy: [asc(vendors.scope), asc(vendors.displayName)],
  });

  return rows.map((v) => ({
    id: v.id,
    name: v.name,
    displayName: v.displayName,
    logoUrl: v.logoUrl,
    website: v.website,
    email: v.email,
    phone: v.phone,
    address: v.address,
    companyId: v.companyId,
    scope: v.scope,
    categoryKeys: (v.categoryLinks ?? []).map((c) => c.categoryKey),
  }));
}

export async function getItemPayments(workspaceId: string, itemId: string) {
  return db.query.transactions.findMany({
    where: and(
      eq(transactions.workspaceId, workspaceId),
      eq(transactions.itemId, itemId),
    ),
    with: { category: true },
    orderBy: [desc(transactions.date), desc(transactions.createdAt)],
  });
}

export async function getItemEvents(workspaceId: string, itemId: string) {
  return db.query.calendarEvents.findMany({
    where: and(
      eq(calendarEvents.workspaceId, workspaceId),
      eq(calendarEvents.itemId, itemId),
    ),
    orderBy: [asc(calendarEvents.eventDate)],
  });
}

export async function getItemDocuments(workspaceId: string, itemId: string) {
  return db.query.documents.findMany({
    where: and(
      eq(documents.workspaceId, workspaceId),
      eq(documents.itemId, itemId),
    ),
    orderBy: [desc(documents.createdAt)],
  });
}

export async function getItemRelations(workspaceId: string, itemId: string) {
  const rows = await db.query.itemRelations.findMany({
    where: and(
      eq(itemRelations.workspaceId, workspaceId),
      or(
        eq(itemRelations.sourceItemId, itemId),
        eq(itemRelations.targetItemId, itemId),
      ),
    ),
    with: { sourceItem: true, targetItem: true },
  });
  return rows;
}

export async function getWorkspaceItemsForSelect(workspaceId: string) {
  return db.query.items.findMany({
    where: and(
      eq(items.workspaceId, workspaceId),
      eq(items.status, "active"),
    ),
    orderBy: [asc(items.name)],
  });
}

export async function getTransactionItemPickerGroups(
  workspaceId: string,
  options?: { filterModuleId?: string | null },
) {
  const { buildTransactionItemPickerGroups } = await import(
    "@/lib/transaction-item-picker"
  );
  const [itemRows, moduleRows] = await Promise.all([
    getAllWorkspaceItems(workspaceId),
    db.query.modules.findMany({
      where: eq(modules.workspaceId, workspaceId),
      columns: { id: true, slug: true, enabled: true, sortOrder: true },
    }),
  ]);

  const activeItems = itemRows.filter((i) => i.status === "active");
  return buildTransactionItemPickerGroups(
    activeItems.map((i) => ({
      id: i.id,
      name: i.name,
      type: i.type,
      moduleId: i.moduleId,
      status: i.status,
      attributes: i.attributes,
      parentItemId: i.parentItemId ?? i.parentPropertyId,
      parentPropertyId: i.parentPropertyId,
    })),
    moduleRows.filter((m) => m.enabled !== false),
    options,
  );
}

export async function getAllWorkspaceEvents(workspaceId: string) {
  return db.query.calendarEvents.findMany({
    where: eq(calendarEvents.workspaceId, workspaceId),
    with: { module: true },
    orderBy: [asc(calendarEvents.eventDate)],
  });
}

export async function getAllWorkspaceDocuments(workspaceId: string) {
  return db.query.documents.findMany({
    where: eq(documents.workspaceId, workspaceId),
    with: { module: true },
    orderBy: [desc(documents.createdAt)],
  });
}

export async function getAllWorkspaceItems(workspaceId: string) {
  const rows = await db.query.items.findMany({
    where: eq(items.workspaceId, workspaceId),
    with: { module: true, assignedMember: true },
    orderBy: [asc(items.name)],
  });

  const itemIds = rows.map((r) => r.id);
  const parentByItem = new Map<string, string>();
  if (itemIds.length > 0) {
    const relations = await db.query.itemRelations.findMany({
      where: and(
        eq(itemRelations.workspaceId, workspaceId),
        inArray(itemRelations.sourceItemId, itemIds),
        eq(itemRelations.relationType, "belongs_to"),
      ),
    });
    for (const rel of relations) {
      parentByItem.set(rel.sourceItemId, rel.targetItemId);
    }
  }

  return rows.map((row) => {
    const parentItemId = parentByItem.get(row.id) ?? null;
    return {
      ...row,
      parentItemId,
      /** @deprecated Prefer parentItemId — kept for property-service path helpers. */
      parentPropertyId: parentItemId,
    };
  });
}

/** Services linked to a property via belongs_to (source=service, target=property). */
export async function getPropertyServices(
  workspaceId: string,
  propertyId: string,
) {
  const relations = await db.query.itemRelations.findMany({
    where: and(
      eq(itemRelations.workspaceId, workspaceId),
      eq(itemRelations.targetItemId, propertyId),
      eq(itemRelations.relationType, "belongs_to"),
    ),
    with: {
      sourceItem: {
        with: { vendor: true },
      },
    },
  });
  return relations
    .map((r) => r.sourceItem)
    .filter(
      (item) =>
        item &&
        (item.type === "property_service" || item.type === "household_service") &&
        item.status !== "archived",
    );
}

export async function getParentPropertyId(
  workspaceId: string,
  serviceId: string,
) {
  return getParentItemId(workspaceId, serviceId);
}

export async function getParentItemId(workspaceId: string, itemId: string) {
  const relation = await db.query.itemRelations.findFirst({
    where: and(
      eq(itemRelations.workspaceId, workspaceId),
      eq(itemRelations.sourceItemId, itemId),
      eq(itemRelations.relationType, "belongs_to"),
    ),
  });
  return relation?.targetItemId ?? null;
}

/** Services linked to a vehicle via belongs_to (source=service, target=vehicle). */
export async function getVehicleServices(
  workspaceId: string,
  vehicleId: string,
) {
  const relations = await db.query.itemRelations.findMany({
    where: and(
      eq(itemRelations.workspaceId, workspaceId),
      eq(itemRelations.targetItemId, vehicleId),
      eq(itemRelations.relationType, "belongs_to"),
    ),
    with: {
      sourceItem: {
        with: { vendor: true },
      },
    },
  });
  return relations
    .map((r) => r.sourceItem)
    .filter(
      (item) =>
        item &&
        item.type === "vehicle_service" &&
        item.status !== "archived",
    );
}

export async function getVehicleSubtreeItemIds(
  workspaceId: string,
  vehicleId: string,
) {
  const services = await getVehicleServices(workspaceId, vehicleId);
  return [vehicleId, ...services.map((s) => s.id)];
}

export async function getVehicleSubtreePayments(
  workspaceId: string,
  vehicleId: string,
) {
  const ids = await getVehicleSubtreeItemIds(workspaceId, vehicleId);
  return db.query.transactions.findMany({
    where: and(
      eq(transactions.workspaceId, workspaceId),
      inArray(transactions.itemId, ids),
    ),
    with: { category: true },
    orderBy: [desc(transactions.date), desc(transactions.createdAt)],
  });
}

export async function getVehicleSubtreeEvents(
  workspaceId: string,
  vehicleId: string,
) {
  const ids = await getVehicleSubtreeItemIds(workspaceId, vehicleId);
  return db.query.calendarEvents.findMany({
    where: and(
      eq(calendarEvents.workspaceId, workspaceId),
      inArray(calendarEvents.itemId, ids),
    ),
    orderBy: [asc(calendarEvents.eventDate)],
  });
}

export async function getVehicleSubtreeDocuments(
  workspaceId: string,
  vehicleId: string,
) {
  const ids = await getVehicleSubtreeItemIds(workspaceId, vehicleId);
  return db.query.documents.findMany({
    where: and(
      eq(documents.workspaceId, workspaceId),
      inArray(documents.itemId, ids),
    ),
    orderBy: [desc(documents.createdAt)],
  });
}

export async function getPropertySubtreeItemIds(
  workspaceId: string,
  propertyId: string,
) {
  const services = await getPropertyServices(workspaceId, propertyId);
  return [propertyId, ...services.map((s) => s.id)];
}

export async function getItemSubtreePayments(
  workspaceId: string,
  propertyId: string,
) {
  const ids = await getPropertySubtreeItemIds(workspaceId, propertyId);
  return db.query.transactions.findMany({
    where: and(
      eq(transactions.workspaceId, workspaceId),
      inArray(transactions.itemId, ids),
    ),
    with: { category: true },
    orderBy: [desc(transactions.date), desc(transactions.createdAt)],
  });
}

export async function getItemSubtreeEvents(
  workspaceId: string,
  propertyId: string,
) {
  const ids = await getPropertySubtreeItemIds(workspaceId, propertyId);
  return db.query.calendarEvents.findMany({
    where: and(
      eq(calendarEvents.workspaceId, workspaceId),
      inArray(calendarEvents.itemId, ids),
    ),
    orderBy: [asc(calendarEvents.eventDate)],
  });
}

export async function getItemSubtreeDocuments(
  workspaceId: string,
  propertyId: string,
) {
  const ids = await getPropertySubtreeItemIds(workspaceId, propertyId);
  return db.query.documents.findMany({
    where: and(
      eq(documents.workspaceId, workspaceId),
      inArray(documents.itemId, ids),
    ),
    orderBy: [desc(documents.createdAt)],
  });
}

export async function getPropertyCardSummaries(
  workspaceId: string,
  propertyIds: string[],
) {
  if (propertyIds.length === 0) {
    return new Map<
      string,
      { paymentCount: number; nextEventDate: string | null }
    >();
  }

  const allRelations = await db.query.itemRelations.findMany({
    where: and(
      eq(itemRelations.workspaceId, workspaceId),
      inArray(itemRelations.targetItemId, propertyIds),
      eq(itemRelations.relationType, "belongs_to"),
    ),
  });

  const subtreeByProperty = new Map<string, string[]>();
  for (const id of propertyIds) {
    subtreeByProperty.set(id, [id]);
  }
  for (const rel of allRelations) {
    const list = subtreeByProperty.get(rel.targetItemId);
    if (list) list.push(rel.sourceItemId);
  }

  const allItemIds = [...new Set([...subtreeByProperty.values()].flat())];
  const today = new Date().toISOString().slice(0, 10);

  const [payments, events] = await Promise.all([
    db.query.transactions.findMany({
      where: and(
        eq(transactions.workspaceId, workspaceId),
        inArray(transactions.itemId, allItemIds),
      ),
      columns: { id: true, itemId: true },
    }),
    db.query.calendarEvents.findMany({
      where: and(
        eq(calendarEvents.workspaceId, workspaceId),
        inArray(calendarEvents.itemId, allItemIds),
        gte(calendarEvents.eventDate, today),
      ),
      columns: { itemId: true, eventDate: true },
      orderBy: [asc(calendarEvents.eventDate)],
    }),
  ]);

  const result = new Map<
    string,
    { paymentCount: number; nextEventDate: string | null }
  >();

  for (const [propertyId, ids] of subtreeByProperty) {
    const idSet = new Set(ids);
    const paymentCount = payments.filter(
      (p) => p.itemId && idSet.has(p.itemId),
    ).length;
    const nextEvent = events.find((e) => e.itemId && idSet.has(e.itemId));
    result.set(propertyId, {
      paymentCount,
      nextEventDate: nextEvent?.eventDate ?? null,
    });
  }

  return result;
}

export async function getVehicleCardSummaries(
  workspaceId: string,
  vehicleIds: string[],
) {
  if (vehicleIds.length === 0) {
    return new Map<
      string,
      { paymentCount: number; nextEventDate: string | null }
    >();
  }

  const today = new Date().toISOString().slice(0, 10);

  const [payments, events] = await Promise.all([
    db.query.transactions.findMany({
      where: and(
        eq(transactions.workspaceId, workspaceId),
        inArray(transactions.itemId, vehicleIds),
      ),
      columns: { id: true, itemId: true },
    }),
    db.query.calendarEvents.findMany({
      where: and(
        eq(calendarEvents.workspaceId, workspaceId),
        inArray(calendarEvents.itemId, vehicleIds),
        gte(calendarEvents.eventDate, today),
      ),
      columns: { itemId: true, eventDate: true },
      orderBy: [asc(calendarEvents.eventDate)],
    }),
  ]);

  const result = new Map<
    string,
    { paymentCount: number; nextEventDate: string | null }
  >();

  for (const vehicleId of vehicleIds) {
    const paymentCount = payments.filter((p) => p.itemId === vehicleId).length;
    const nextEvent = events.find((e) => e.itemId === vehicleId);
    result.set(vehicleId, {
      paymentCount,
      nextEventDate: nextEvent?.eventDate ?? null,
    });
  }

  return result;
}
