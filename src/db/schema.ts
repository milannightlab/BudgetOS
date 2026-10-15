import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const memberRoleEnum = pgEnum("member_role", ["owner", "member"]);
export const inviteStatusEnum = pgEnum("invite_status", [
  "pending",
  "accepted",
  "revoked",
]);
export const transactionTypeEnum = pgEnum("transaction_type", [
  "income",
  "expense",
]);
export const transactionStatusEnum = pgEnum("transaction_status", [
  "actual",
  "planned",
]);
export const recurringFrequencyEnum = pgEnum("recurring_frequency", [
  "weekly",
  "monthly",
  "yearly",
]);
export const calendarEventTypeEnum = pgEnum("calendar_event_type", [
  "deadline",
  "event",
  "reminder",
]);
export const entityTypeEnum = pgEnum("entity_type", [
  "document",
  "calendar_event",
  "transaction",
  "recurring_payment",
  "module",
  "item",
]);
export const itemStatusEnum = pgEnum("item_status", [
  "active",
  "inactive",
  "archived",
]);
export const vendorScopeEnum = pgEnum("vendor_scope", ["global", "custom"]);
export const vendorStatusEnum = pgEnum("vendor_status", [
  "active",
  "archived",
]);

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const workspaces = pgTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  currency: text("currency").notNull().default("EUR"),
  /** Sort position of Prehľad among module nav items (with modules.sort_order). */
  overviewSortOrder: integer("overview_sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: memberRoleEnum("role").notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("workspace_user_idx").on(table.workspaceId, table.userId)],
);

export const workspaceInvites = pgTable("workspace_invites", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  status: inviteStatusEnum("status").notNull().default("pending"),
  invitedByUserId: text("invited_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const modules = pgTable(
  "modules",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("module_workspace_slug_idx").on(table.workspaceId, table.slug),
  ],
);

export const vendors = pgTable(
  "vendors",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    displayName: text("display_name").notNull(),
    logoUrl: text("logo_url"),
    website: text("website"),
    email: text("email"),
    phone: text("phone"),
    address: text("address"),
    companyId: text("company_id"),
    scope: vendorScopeEnum("scope").notNull().default("custom"),
    workspaceId: text("workspace_id").references(() => workspaces.id, {
      onDelete: "cascade",
    }),
    status: vendorStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("vendors_global_name_idx")
      .on(table.name)
      .where(sql`scope = 'global'`),
    uniqueIndex("vendors_workspace_name_idx")
      .on(table.workspaceId, table.name)
      .where(sql`scope = 'custom'`),
  ],
);

export const vendorCategories = pgTable(
  "vendor_categories",
  {
    id: text("id").primaryKey(),
    vendorId: text("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    categoryKey: text("category_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("vendor_category_idx").on(table.vendorId, table.categoryKey),
  ],
);

export const items = pgTable("items", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  moduleId: text("module_id")
    .notNull()
    .references(() => modules.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: itemStatusEnum("status").notNull().default("active"),
  sortOrder: integer("sort_order").notNull().default(0),
  vendorId: text("vendor_id").references(() => vendors.id, {
    onDelete: "set null",
  }),
  assignedMemberUserId: text("assigned_member_user_id").references(
    () => users.id,
    { onDelete: "set null" },
  ),
  attributes: jsonb("attributes")
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const itemRelations = pgTable(
  "item_relations",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    sourceItemId: text("source_item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    targetItemId: text("target_item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    relationType: text("relation_type").notNull().default("related_to"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("item_relation_unique_idx").on(
      table.workspaceId,
      table.sourceItemId,
      table.targetItemId,
      table.relationType,
    ),
  ],
);

export const categories = pgTable("categories", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  moduleId: text("module_id").references(() => modules.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  icon: text("icon").notNull().default("circle"),
  color: text("color").notNull().default("#64748b"),
  isDefault: boolean("is_default").notNull().default(false),
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const recurringPayments = pgTable("recurring_payments", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  categoryId: text("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "restrict" }),
  moduleId: text("module_id").references(() => modules.id, {
    onDelete: "set null",
  }),
  itemId: text("item_id").references(() => items.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  type: transactionTypeEnum("type").notNull().default("expense"),
  frequency: recurringFrequencyEnum("frequency").notNull(),
  nextDueDate: date("next_due_date").notNull(),
  /** Inclusive end date; null = open-ended series. */
  endDate: date("end_date"),
  note: text("note"),
  active: boolean("active").notNull().default(true),
  createdByUserId: text("created_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const transactions = pgTable("transactions", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  categoryId: text("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "restrict" }),
  moduleId: text("module_id").references(() => modules.id, {
    onDelete: "set null",
  }),
  itemId: text("item_id").references(() => items.id, { onDelete: "set null" }),
  createdByUserId: text("created_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  recurringPaymentId: text("recurring_payment_id").references(
    () => recurringPayments.id,
    { onDelete: "set null" },
  ),
  title: text("title").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  type: transactionTypeEnum("type").notNull(),
  status: transactionStatusEnum("status").notNull().default("actual"),
  date: date("date").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const budgets = pgTable(
  "budgets",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    month: integer("month").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("budget_period_idx").on(
      table.workspaceId,
      table.categoryId,
      table.year,
      table.month,
    ),
  ],
);

export const calendarEvents = pgTable("calendar_events", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  moduleId: text("module_id").references(() => modules.id, {
    onDelete: "set null",
  }),
  itemId: text("item_id").references(() => items.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  eventDate: date("event_date").notNull(),
  type: calendarEventTypeEnum("type").notNull().default("deadline"),
  note: text("note"),
  completed: boolean("completed").notNull().default(false),
  createdByUserId: text("created_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const documents = pgTable("documents", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  moduleId: text("module_id").references(() => modules.id, {
    onDelete: "set null",
  }),
  itemId: text("item_id").references(() => items.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  blobUrl: text("blob_url").notNull(),
  uploadedByUserId: text("uploaded_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const entityLinks = pgTable(
  "entity_links",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    fromType: entityTypeEnum("from_type").notNull(),
    fromId: text("from_id").notNull(),
    toType: entityTypeEnum("to_type").notNull(),
    toId: text("to_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("entity_link_unique_idx").on(
      table.workspaceId,
      table.fromType,
      table.fromId,
      table.toType,
      table.toId,
    ),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(workspaceMembers),
}));

export const workspacesRelations = relations(workspaces, ({ many }) => ({
  members: many(workspaceMembers),
  modules: many(modules),
  items: many(items),
  categories: many(categories),
  vendors: many(vendors),
  transactions: many(transactions),
  recurringPayments: many(recurringPayments),
  budgets: many(budgets),
  invites: many(workspaceInvites),
  calendarEvents: many(calendarEvents),
  documents: many(documents),
  entityLinks: many(entityLinks),
}));

export const vendorsRelations = relations(vendors, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [vendors.workspaceId],
    references: [workspaces.id],
  }),
  // Named distinctly from the `categories` payment-category table to avoid
  // Drizzle relation graph collisions (referencedTable undefined at runtime).
  categoryLinks: many(vendorCategories),
  items: many(items),
}));

export const vendorCategoriesRelations = relations(
  vendorCategories,
  ({ one }) => ({
    vendor: one(vendors, {
      fields: [vendorCategories.vendorId],
      references: [vendors.id],
    }),
  }),
);

export const workspaceMembersRelations = relations(
  workspaceMembers,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspaceMembers.workspaceId],
      references: [workspaces.id],
    }),
    user: one(users, {
      fields: [workspaceMembers.userId],
      references: [users.id],
    }),
  }),
);

export const modulesRelations = relations(modules, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [modules.workspaceId],
    references: [workspaces.id],
  }),
  items: many(items),
  categories: many(categories),
  recurringPayments: many(recurringPayments),
  transactions: many(transactions),
  calendarEvents: many(calendarEvents),
  documents: many(documents),
}));

export const itemsRelations = relations(items, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [items.workspaceId],
    references: [workspaces.id],
  }),
  module: one(modules, {
    fields: [items.moduleId],
    references: [modules.id],
  }),
  vendor: one(vendors, {
    fields: [items.vendorId],
    references: [vendors.id],
  }),
  assignedMember: one(users, {
    fields: [items.assignedMemberUserId],
    references: [users.id],
  }),
  transactions: many(transactions),
  calendarEvents: many(calendarEvents),
  documents: many(documents),
  relationsFrom: many(itemRelations, { relationName: "sourceItem" }),
  relationsTo: many(itemRelations, { relationName: "targetItem" }),
}));

export const itemRelationsTableRelations = relations(
  itemRelations,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [itemRelations.workspaceId],
      references: [workspaces.id],
    }),
    sourceItem: one(items, {
      fields: [itemRelations.sourceItemId],
      references: [items.id],
      relationName: "sourceItem",
    }),
    targetItem: one(items, {
      fields: [itemRelations.targetItemId],
      references: [items.id],
      relationName: "targetItem",
    }),
  }),
);

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [categories.workspaceId],
    references: [workspaces.id],
  }),
  module: one(modules, {
    fields: [categories.moduleId],
    references: [modules.id],
  }),
  transactions: many(transactions),
  budgets: many(budgets),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [transactions.workspaceId],
    references: [workspaces.id],
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
  module: one(modules, {
    fields: [transactions.moduleId],
    references: [modules.id],
  }),
  item: one(items, {
    fields: [transactions.itemId],
    references: [items.id],
  }),
  recurringPayment: one(recurringPayments, {
    fields: [transactions.recurringPaymentId],
    references: [recurringPayments.id],
  }),
}));

export const recurringPaymentsRelations = relations(
  recurringPayments,
  ({ one, many }) => ({
    workspace: one(workspaces, {
      fields: [recurringPayments.workspaceId],
      references: [workspaces.id],
    }),
    category: one(categories, {
      fields: [recurringPayments.categoryId],
      references: [categories.id],
    }),
    module: one(modules, {
      fields: [recurringPayments.moduleId],
      references: [modules.id],
    }),
    item: one(items, {
      fields: [recurringPayments.itemId],
      references: [items.id],
    }),
    transactions: many(transactions),
  }),
);

export const budgetsRelations = relations(budgets, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [budgets.workspaceId],
    references: [workspaces.id],
  }),
  category: one(categories, {
    fields: [budgets.categoryId],
    references: [categories.id],
  }),
}));

export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [calendarEvents.workspaceId],
    references: [workspaces.id],
  }),
  module: one(modules, {
    fields: [calendarEvents.moduleId],
    references: [modules.id],
  }),
  item: one(items, {
    fields: [calendarEvents.itemId],
    references: [items.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [documents.workspaceId],
    references: [workspaces.id],
  }),
  module: one(modules, {
    fields: [documents.moduleId],
    references: [modules.id],
  }),
  item: one(items, {
    fields: [documents.itemId],
    references: [items.id],
  }),
}));

export const entityLinksRelations = relations(entityLinks, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [entityLinks.workspaceId],
    references: [workspaces.id],
  }),
}));
