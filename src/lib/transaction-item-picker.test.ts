import { describe, expect, it } from "vitest";
import {
  buildTransactionItemPickerGroups,
  findTransactionItemOptionLabel,
} from "@/lib/transaction-item-picker";

describe("buildTransactionItemPickerGroups", () => {
  it("nests property services under their parent property", () => {
    const groups = buildTransactionItemPickerGroups(
      [
        {
          id: "prop1",
          name: "MAD House",
          type: "property",
          moduleId: "mod-h",
          status: "active",
          attributes: {},
        },
        {
          id: "prop2",
          name: "Brloh",
          type: "property",
          moduleId: "mod-h",
          status: "active",
          attributes: {},
        },
        {
          id: "svc1",
          name: "VSE",
          type: "property_service",
          moduleId: "mod-h",
          status: "active",
          attributes: { serviceType: "electricity" },
          parentItemId: "prop1",
        },
        {
          id: "svc2",
          name: "O2",
          type: "property_service",
          moduleId: "mod-h",
          status: "active",
          attributes: { serviceType: "internet" },
          parentItemId: "prop1",
        },
        {
          id: "car1",
          name: "Nissan X-Trail",
          type: "vehicle",
          moduleId: "mod-t",
          status: "active",
          attributes: {},
        },
        {
          id: "car2",
          name: "Toyota",
          type: "vehicle",
          moduleId: "mod-t",
          status: "active",
          attributes: {},
        },
      ],
      [
        { id: "mod-h", slug: "household" },
        { id: "mod-t", slug: "transport" },
      ],
    );

    expect(groups).toEqual([
      {
        id: "mod-h",
        label: "Nehnuteľnosti",
        options: [
          {
            id: "prop2",
            label: "Brloh",
            moduleId: "mod-h",
            depth: 0,
            parentId: null,
          },
          {
            id: "prop1",
            label: "MAD House",
            moduleId: "mod-h",
            depth: 0,
            parentId: null,
          },
          {
            id: "svc1",
            label: "Elektrina",
            moduleId: "mod-h",
            depth: 1,
            parentId: "prop1",
          },
          {
            id: "svc2",
            label: "Internet",
            moduleId: "mod-h",
            depth: 1,
            parentId: "prop1",
          },
        ],
      },
      {
        id: "mod-t",
        label: "Vozidlá",
        options: [
          {
            id: "car1",
            label: "Nissan X-Trail",
            moduleId: "mod-t",
            depth: 0,
            parentId: null,
          },
          {
            id: "car2",
            label: "Toyota",
            moduleId: "mod-t",
            depth: 0,
            parentId: null,
          },
        ],
      },
    ]);
  });

  it("nests vehicle children and other module relations the same way", () => {
    const groups = buildTransactionItemPickerGroups(
      [
        {
          id: "car1",
          name: "Nissan X-Trail",
          type: "vehicle",
          moduleId: "mod-t",
          status: "active",
          attributes: {},
        },
        {
          id: "ins1",
          name: "PZP",
          type: "generic",
          moduleId: "mod-t",
          status: "active",
          attributes: {},
          parentItemId: "car1",
        },
        {
          id: "stk1",
          name: "STK",
          type: "generic",
          moduleId: "mod-t",
          status: "active",
          attributes: {},
          parentItemId: "car1",
        },
        {
          id: "school1",
          name: "ZŠ Madárska",
          type: "school",
          moduleId: "mod-c",
          status: "active",
          attributes: {},
        },
        {
          id: "act1",
          name: "Futbal",
          type: "extracurricular",
          moduleId: "mod-c",
          status: "active",
          attributes: {},
          parentItemId: "school1",
        },
        {
          id: "sub1",
          name: "Netflix",
          type: "subscription",
          moduleId: "mod-s",
          status: "active",
          attributes: {},
        },
      ],
      [
        { id: "mod-t", slug: "transport" },
        { id: "mod-c", slug: "children" },
        { id: "mod-s", slug: "subscriptions" },
      ],
    );

    expect(groups).toEqual([
      {
        id: "mod-c",
        label: "Rodina",
        options: [
          {
            id: "school1",
            label: "ZŠ Madárska",
            moduleId: "mod-c",
            depth: 0,
            parentId: null,
          },
          {
            id: "act1",
            label: "Futbal",
            moduleId: "mod-c",
            depth: 1,
            parentId: "school1",
          },
        ],
      },
      {
        id: "mod-t",
        label: "Vozidlá",
        options: [
          {
            id: "car1",
            label: "Nissan X-Trail",
            moduleId: "mod-t",
            depth: 0,
            parentId: null,
          },
          {
            id: "ins1",
            label: "PZP",
            moduleId: "mod-t",
            depth: 1,
            parentId: "car1",
          },
          {
            id: "stk1",
            label: "STK",
            moduleId: "mod-t",
            depth: 1,
            parentId: "car1",
          },
        ],
      },
      {
        id: "mod-s",
        label: "Predplatné a členstvá",
        options: [
          {
            id: "sub1",
            label: "Netflix",
            moduleId: "mod-s",
            depth: 0,
            parentId: null,
          },
        ],
      },
    ]);
  });

  it("formats nested labels with parent hierarchy", () => {
    const groups = buildTransactionItemPickerGroups(
      [
        {
          id: "prop1",
          name: "MAD House",
          type: "property",
          moduleId: "mod-h",
          status: "active",
          attributes: {},
        },
        {
          id: "svc1",
          name: "VSE",
          type: "property_service",
          moduleId: "mod-h",
          status: "active",
          attributes: { serviceType: "electricity" },
          parentItemId: "prop1",
        },
      ],
      [{ id: "mod-h", slug: "household" }],
    );

    expect(findTransactionItemOptionLabel(groups, "prop1")).toBe(
      "Nehnuteľnosti: MAD House",
    );
    expect(findTransactionItemOptionLabel(groups, "svc1")).toBe(
      "Nehnuteľnosti: MAD House › Elektrina",
    );
  });
});
