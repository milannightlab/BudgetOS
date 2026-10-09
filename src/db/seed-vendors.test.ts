import { describe, expect, it } from "vitest";
import { GLOBAL_VENDOR_SEEDS } from "@/db/seed-vendors";
import { isVendorCategoryKey } from "@/modules/vendor-categories";

describe("GLOBAL_VENDOR_SEEDS", () => {
  it("has unique canonical names", () => {
    const names = GLOBAL_VENDOR_SEEDS.map((v) => v.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("only uses known vendor category keys", () => {
    for (const vendor of GLOBAL_VENDOR_SEEDS) {
      expect(vendor.categories.length).toBeGreaterThan(0);
      for (const key of vendor.categories) {
        expect(isVendorCategoryKey(key)).toBe(true);
      }
    }
  });

  it("does not invent logo or company identifiers", () => {
    for (const vendor of GLOBAL_VENDOR_SEEDS) {
      expect(vendor).not.toHaveProperty("logoUrl");
      expect(vendor).not.toHaveProperty("companyId");
    }
  });
});
