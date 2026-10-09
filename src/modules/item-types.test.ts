import { describe, expect, it } from "vitest";
import {
  buildAttributesSchema,
  canRelateItems,
  getAllItemTypeSlugs,
  getItemTypeDefinition,
  getItemTypesForModule,
  ITEM_TYPES_BY_MODULE,
  parseAttributes,
} from "@/modules/item-types";
import { MODULES, type ModuleSlug } from "@/modules/registry";

describe("item types registry", () => {
  it("covers every module slug", () => {
    for (const mod of MODULES) {
      const types = ITEM_TYPES_BY_MODULE[mod.slug as ModuleSlug];
      expect(types?.length).toBeGreaterThan(0);
      expect(types.some((t) => t.type === "generic")).toBe(true);
    }
  });

  it("property_service uses vendor relation instead of provider attribute", () => {
    const fields = getItemTypeDefinition("household", "property_service")!.fields.map(
      (f) => f.key,
    );
    expect(fields).not.toContain("provider");
    expect(fields).toContain("contractNumber");
    expect(fields).toContain("customerNumber");
  });

  it("includes expected domain types", () => {
    const slugs = getAllItemTypeSlugs();
    for (const expected of [
      "property",
      "property_service",
      "school",
      "extracurricular",
      "vehicle",
      "subscription",
      "insurance_policy",
      "loan",
      "investment",
      "healthcare_provider",
      "health_plan",
      "identity_document",
      "permit",
      "trip",
      "leisure_pass",
      "generic",
    ]) {
      expect(slugs).toContain(expected);
    }
  });

  it("resolves type definitions per module", () => {
    expect(getItemTypeDefinition("household", "property")?.label).toBe(
      "Nehnuteľnosť",
    );
    expect(getItemTypeDefinition("insurance", "insurance_policy")).toBeTruthy();
    expect(getItemTypesForModule("transport").map((t) => t.type)).toContain(
      "vehicle",
    );
    expect(getItemTypeDefinition("health", "healthcare_provider")).toBeTruthy();
    expect(getItemTypeDefinition("personal", "identity_document")).toBeTruthy();
    expect(getItemTypesForModule("travel").map((t) => t.type)).toContain(
      "trip",
    );
  });
});

describe("buildAttributesSchema / parseAttributes", () => {
  const property = getItemTypeDefinition("household", "property")!;
  const loan = getItemTypeDefinition("loans", "loan")!;

  it("accepts valid attribute values", () => {
    const parsed = parseAttributes(property, {
      address: "Hlavná 1",
      propertyType: "apartment",
      relationshipType: "own",
    });
    expect(parsed.address).toBe("Hlavná 1");
    expect(parsed.propertyType).toBe("apartment");
    expect(parsed.relationshipType).toBe("own");
  });

  it("strips empty optional fields", () => {
    const parsed = parseAttributes(property, {
      address: "",
      propertyType: "",
    });
    expect(parsed).toEqual({});
  });

  it("rejects invalid dates", () => {
    const schema = buildAttributesSchema(loan);
    const result = schema.safeParse({ maturityDate: "01-05-2020" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid select options", () => {
    const schema = buildAttributesSchema(property);
    const result = schema.safeParse({ propertyType: "castle" });
    expect(result.success).toBe(false);
  });

  it("coerces numeric fields", () => {
    const schema = buildAttributesSchema(loan);
    const result = schema.safeParse({ originalPrincipal: "120" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.originalPrincipal).toBe(120);
  });
});

describe("canRelateItems", () => {
  it("allows distinct item ids", () => {
    expect(canRelateItems("itm_a", "itm_b")).toBe(true);
  });

  it("rejects self-reference", () => {
    expect(canRelateItems("itm_a", "itm_a")).toBe(false);
  });

  it("rejects empty ids", () => {
    expect(canRelateItems("", "itm_b")).toBe(false);
    expect(canRelateItems("itm_a", "")).toBe(false);
  });
});
