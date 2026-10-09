ALTER TABLE "items" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
WITH ranked AS (
  SELECT
    id,
    (ROW_NUMBER() OVER (
      PARTITION BY workspace_id, module_id, type
      ORDER BY created_at ASC
    ) - 1)::integer AS rn
  FROM items
)
UPDATE items
SET sort_order = ranked.rn
FROM ranked
WHERE items.id = ranked.id;