import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { vendorCategories, vendors } from "@/db/schema";
import { createId } from "@/lib/id";

type SeedVendor = {
  name: string;
  displayName: string;
  website?: string;
  categories: string[];
};

/**
 * Small catalog of common Slovak providers.
 * Only include verified public website URLs; leave IČO/logo empty.
 */
export const GLOBAL_VENDOR_SEEDS: readonly SeedVendor[] = [
  {
    name: "vse",
    displayName: "VSE",
    website: "https://www.vse.sk",
    categories: ["electricity"],
  },
  {
    name: "zse",
    displayName: "ZSE",
    website: "https://www.zse.sk",
    categories: ["electricity"],
  },
  {
    name: "sse",
    displayName: "SSE",
    website: "https://www.sse.sk",
    categories: ["electricity"],
  },
  {
    name: "spp",
    displayName: "SPP",
    website: "https://www.spp.sk",
    categories: ["gas", "electricity"],
  },
  {
    name: "slovak-telekom",
    displayName: "Telekom",
    website: "https://www.telekom.sk",
    categories: ["internet", "mobile"],
  },
  {
    name: "orange-slovakia",
    displayName: "Orange",
    website: "https://www.orange.sk",
    categories: ["internet", "mobile"],
  },
  {
    name: "o2-slovakia",
    displayName: "O2",
    website: "https://www.o2.sk",
    categories: ["internet", "mobile"],
  },
  {
    name: "4ka",
    displayName: "4ka",
    website: "https://www.4ka.sk",
    categories: ["mobile"],
  },
  {
    name: "allianz-sk",
    displayName: "Allianz",
    website: "https://www.allianz.sk",
    categories: ["insurance_home", "insurance_car", "insurance_life"],
  },
  {
    name: "generali-sk",
    displayName: "Generali",
    website: "https://www.generali.sk",
    categories: ["insurance_home", "insurance_car", "insurance_life"],
  },
  {
    name: "komunalna-poistovna",
    displayName: "Komunálna poisťovňa",
    website: "https://www.kpas.sk",
    categories: ["insurance_home", "insurance_car"],
  },
  {
    name: "union-sk",
    displayName: "Union",
    website: "https://www.union.sk",
    categories: ["insurance_home", "insurance_car", "insurance_life"],
  },
] as const;

let seedPromise: Promise<void> | null = null;

/** Idempotent upsert of global vendors + categories (once per process). */
export async function seedGlobalVendors() {
  if (!seedPromise) {
    seedPromise = seedGlobalVendorsOnce().catch((err) => {
      seedPromise = null;
      throw err;
    });
  }
  return seedPromise;
}

async function seedGlobalVendorsOnce() {
  for (const seed of GLOBAL_VENDOR_SEEDS) {
    // Use SQL API (not relational `with`) to avoid relation-graph edge cases
    // during app bootstrap / HMR.
    const existingRows = await db
      .select({ id: vendors.id })
      .from(vendors)
      .where(and(eq(vendors.scope, "global"), eq(vendors.name, seed.name)))
      .limit(1);

    let vendorId = existingRows[0]?.id;
    if (!vendorId) {
      vendorId = createId("vnd");
      try {
        await db.insert(vendors).values({
          id: vendorId,
          name: seed.name,
          displayName: seed.displayName,
          website: seed.website ?? null,
          scope: "global",
          workspaceId: null,
          status: "active",
        });
      } catch {
        // Concurrent seed / unique race — reload existing row.
        const again = await db
          .select({ id: vendors.id })
          .from(vendors)
          .where(and(eq(vendors.scope, "global"), eq(vendors.name, seed.name)))
          .limit(1);
        if (!again[0]) throw new Error(`Seed vendor failed: ${seed.name}`);
        vendorId = again[0].id;
      }
    } else {
      await db
        .update(vendors)
        .set({
          displayName: seed.displayName,
          website: seed.website ?? null,
          updatedAt: new Date(),
        })
        .where(eq(vendors.id, vendorId));
    }

    const existingCats = await db
      .select({ categoryKey: vendorCategories.categoryKey })
      .from(vendorCategories)
      .where(eq(vendorCategories.vendorId, vendorId));
    const existingKeys = new Set(existingCats.map((c) => c.categoryKey));

    for (const key of seed.categories) {
      if (existingKeys.has(key)) continue;
      try {
        await db.insert(vendorCategories).values({
          id: createId("vcat"),
          vendorId,
          categoryKey: key,
        });
      } catch {
        // unique (vendorId, categoryKey) race — ignore
      }
    }
  }
}
