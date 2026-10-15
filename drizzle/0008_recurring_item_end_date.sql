ALTER TABLE "recurring_payments" ADD COLUMN "item_id" text;--> statement-breakpoint
ALTER TABLE "recurring_payments" ADD COLUMN "end_date" date;--> statement-breakpoint
ALTER TABLE "recurring_payments" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "recurring_payments" ADD CONSTRAINT "recurring_payments_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE set null ON UPDATE no action;
