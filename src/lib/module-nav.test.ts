import { describe, expect, it } from "vitest";
import { buildModuleNavItems, OVERVIEW_NAV_KEY } from "@/lib/module-nav";

describe("buildModuleNavItems", () => {
  it("places overview according to overviewSortOrder", () => {
    const items = buildModuleNavItems({
      overviewSortOrder: 1,
      modules: [
        { slug: "household", sortOrder: 0, enabled: true },
        { slug: "transport", sortOrder: 2, enabled: true },
      ],
      enabledOnly: true,
    });
    expect(items.map((i) => i.key)).toEqual([
      "household",
      OVERVIEW_NAV_KEY,
      "transport",
    ]);
  });

  it("skips disabled modules when enabledOnly", () => {
    const items = buildModuleNavItems({
      overviewSortOrder: 0,
      modules: [
        { slug: "household", sortOrder: 1, enabled: false },
        { slug: "transport", sortOrder: 2, enabled: true },
      ],
      enabledOnly: true,
    });
    expect(items.map((i) => i.key)).toEqual([OVERVIEW_NAV_KEY, "transport"]);
  });
});
