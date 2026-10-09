ALTER TABLE "modules" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE "modules" SET "sort_order" = CASE "slug"
  WHEN 'household' THEN 1
  WHEN 'children' THEN 2
  WHEN 'transport' THEN 3
  WHEN 'subscriptions' THEN 4
  WHEN 'insurance' THEN 5
  WHEN 'loans' THEN 6
  WHEN 'investments' THEN 7
  WHEN 'health' THEN 8
  WHEN 'personal' THEN 9
  WHEN 'travel' THEN 10
  ELSE 100
END;