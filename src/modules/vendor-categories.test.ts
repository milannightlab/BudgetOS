import { describe, expect, it } from "vitest";
import {
  getVendorCategoryLabel,
  isVendorCategoryKey,
  vendorCategoryForServiceType,
} from "@/modules/vendor-categories";

describe("vendor-categories", () => {
  it("recognizes known category keys", () => {
    expect(isVendorCategoryKey("electricity")).toBe(true);
    expect(isVendorCategoryKey("insurance_home")).toBe(true);
    expect(isVendorCategoryKey("not-a-key")).toBe(false);
  });

  it("returns Slovak labels", () => {
    expect(getVendorCategoryLabel("gas")).toBe("Plyn");
    expect(getVendorCategoryLabel("unknown")).toBe("unknown");
  });

  it("maps property service types to vendor categories", () => {
    expect(vendorCategoryForServiceType("electricity")).toBe("electricity");
    expect(vendorCategoryForServiceType("internet")).toBe("internet");
    expect(vendorCategoryForServiceType("mortgage")).toBe("banking");
    expect(vendorCategoryForServiceType("leasing")).toBe("banking");
    expect(vendorCategoryForServiceType("pzp")).toBe("insurance_car");
    expect(vendorCategoryForServiceType("comprehensive")).toBe("insurance_car");
    expect(vendorCategoryForServiceType("repair_fund")).toBeNull();
    expect(vendorCategoryForServiceType("other")).toBeNull();
    expect(vendorCategoryForServiceType("weird")).toBe("other");
  });
});
