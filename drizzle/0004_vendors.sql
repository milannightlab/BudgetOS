CREATE TYPE "public"."vendor_scope" AS ENUM('global', 'custom');--> statement-breakpoint
CREATE TYPE "public"."vendor_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TABLE "vendor_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"vendor_id" text NOT NULL,
	"category_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"logo_url" text,
	"website" text,
	"email" text,
	"phone" text,
	"address" text,
	"company_id" text,
	"scope" "vendor_scope" DEFAULT 'custom' NOT NULL,
	"workspace_id" text,
	"status" "vendor_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "vendor_id" text;--> statement-breakpoint
ALTER TABLE "vendor_categories" ADD CONSTRAINT "vendor_categories_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "vendor_category_idx" ON "vendor_categories" USING btree ("vendor_id","category_key");--> statement-breakpoint
CREATE UNIQUE INDEX "vendors_global_name_idx" ON "vendors" USING btree ("name") WHERE scope = 'global';--> statement-breakpoint
CREATE UNIQUE INDEX "vendors_workspace_name_idx" ON "vendors" USING btree ("workspace_id","name") WHERE scope = 'custom';--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE set null ON UPDATE no action;