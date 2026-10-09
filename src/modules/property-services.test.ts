import { describe, expect, it } from "vitest";
import { canRelateItems } from "@/modules/item-types";
import {
  getServiceTemplatesForPropertyType,
  parseHiddenServiceTypes,
} from "@/modules/property-services";

describe("property service templates", () => {
  it("returns core utilities for a family house", () => {
    const types = getServiceTemplatesForPropertyType("house").map(
      (t) => t.serviceType,
    );
    expect(types).toEqual([
      "electricity",
      "water",
      "gas",
      "internet",
      "waste",
      "heating",
    ]);
  });

  it("adds apartment-specific services", () => {
    const types = getServiceTemplatesForPropertyType("apartment").map(
      (t) => t.serviceType,
    );
    expect(types).toContain("building_manager");
    expect(types).toContain("repair_fund");
  });

  it("uses a simpler set for land", () => {
    const types = getServiceTemplatesForPropertyType("land").map(
      (t) => t.serviceType,
    );
    expect(types).toEqual(["water", "waste", "other"]);
  });
});

describe("parseHiddenServiceTypes", () => {
  it("reads hidden service types from attributes", () => {
    expect(
      parseHiddenServiceTypes({ hiddenServiceTypes: ["gas", "waste"] }),
    ).toEqual(["gas", "waste"]);
  });

  it("returns empty array for missing or invalid values", () => {
    expect(parseHiddenServiceTypes({})).toEqual([]);
    expect(parseHiddenServiceTypes({ hiddenServiceTypes: "gas" })).toEqual([]);
  });
});

describe("service belongs_to property", () => {
  it("allows relating distinct items", () => {
    expect(canRelateItems("svc_1", "prop_1")).toBe(true);
  });
});
