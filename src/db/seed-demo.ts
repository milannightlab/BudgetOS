import { and, eq, inArray, like, ne } from "drizzle-orm";
import { db } from "@/db";
import {
  calendarEvents,
  categories,
  itemRelations,
  items,
  modules,
  transactions,
  vendors,
} from "@/db/schema";
import { createId } from "@/lib/id";
import { seedWorkspaceModules } from "@/lib/modules";
import { seedGlobalVendors } from "@/db/seed-vendors";

/** Marker in transaction/event notes — used for idempotency. */
const DEMO_NOTE = "[vzorové dáta]";

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function addMonths(base: Date, months: number, day?: number) {
  const d = new Date(base);
  d.setMonth(d.getMonth() + months);
  if (day != null) d.setDate(day);
  return d;
}

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

async function findVendorId(name: string) {
  const row = await db.query.vendors.findFirst({
    where: and(eq(vendors.scope, "global"), eq(vendors.name, name)),
    columns: { id: true },
  });
  return row?.id ?? null;
}

export async function hasDemoSeedData(workspaceId: string) {
  const [txn] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(
      and(
        eq(transactions.workspaceId, workspaceId),
        like(transactions.note, `${DEMO_NOTE}%`),
      ),
    )
    .limit(1);
  if (txn) return true;

  const [evt] = await db
    .select({ id: calendarEvents.id })
    .from(calendarEvents)
    .where(
      and(
        eq(calendarEvents.workspaceId, workspaceId),
        like(calendarEvents.note, `${DEMO_NOTE}%`),
      ),
    )
    .limit(1);
  return Boolean(evt);
}

export type SeedDemoResult =
  | { seeded: false; reason: "already_seeded" }
  | {
      seeded: true;
      properties: number;
      vehicles: number;
      services: number;
      payments: number;
      events: number;
    };

type ItemRow = typeof items.$inferSelect;

async function getModuleItems(
  workspaceId: string,
  moduleId: string,
  type: string,
) {
  return db.query.items.findMany({
    where: and(
      eq(items.workspaceId, workspaceId),
      eq(items.moduleId, moduleId),
      eq(items.type, type),
      ne(items.status, "archived"),
    ),
    orderBy: (i, { asc }) => [asc(i.sortOrder), asc(i.name)],
  });
}

async function getPropertyServices(workspaceId: string, propertyId: string) {
  const rels = await db.query.itemRelations.findMany({
    where: and(
      eq(itemRelations.workspaceId, workspaceId),
      eq(itemRelations.targetItemId, propertyId),
      eq(itemRelations.relationType, "belongs_to"),
    ),
  });
  if (rels.length === 0) return [] as ItemRow[];
  const ids = rels.map((r) => r.sourceItemId);
  return db.query.items.findMany({
    where: and(
      eq(items.workspaceId, workspaceId),
      eq(items.type, "property_service"),
      inArray(items.id, ids),
    ),
  });
}

async function ensureService(params: {
  workspaceId: string;
  moduleId: string;
  propertyId: string;
  name: string;
  serviceType: string;
  existing: ItemRow[];
  vendorId?: string | null;
}) {
  const found = params.existing.find(
    (s) =>
      (s.attributes as Record<string, unknown> | null)?.serviceType ===
      params.serviceType,
  );
  if (found) return { item: found, created: false };

  const id = createId("itm");
  const [created] = await db
    .insert(items)
    .values({
      id,
      workspaceId: params.workspaceId,
      moduleId: params.moduleId,
      type: "property_service",
      name: params.name,
      status: "active",
      sortOrder: params.existing.length,
      vendorId: params.vendorId ?? null,
      attributes: { serviceType: params.serviceType },
    })
    .returning();

  await db.insert(itemRelations).values({
    id: createId("irl"),
    workspaceId: params.workspaceId,
    sourceItemId: id,
    targetItemId: params.propertyId,
    relationType: "belongs_to",
  });

  return { item: created, created: true };
}

/**
 * Attaches sample payments + calendar events to existing properties and vehicles.
 * Does not create new properties/vehicles. Idempotent via DEMO_NOTE marker.
 */
export async function seedDemoWorkspaceData(
  workspaceId: string,
  userId: string,
): Promise<SeedDemoResult> {
  if (await hasDemoSeedData(workspaceId)) {
    return { seeded: false, reason: "already_seeded" };
  }

  await seedWorkspaceModules(workspaceId);
  await seedGlobalVendors();

  const [household, transport, cats] = await Promise.all([
    db.query.modules.findFirst({
      where: and(
        eq(modules.workspaceId, workspaceId),
        eq(modules.slug, "household"),
      ),
    }),
    db.query.modules.findFirst({
      where: and(
        eq(modules.workspaceId, workspaceId),
        eq(modules.slug, "transport"),
      ),
    }),
    db.query.categories.findMany({
      where: eq(categories.workspaceId, workspaceId),
    }),
  ]);

  if (!household || !transport) {
    throw new Error("Moduly household/transport nie sú dostupné");
  }

  const properties = await getModuleItems(
    workspaceId,
    household.id,
    "property",
  );
  const vehicles = await getModuleItems(workspaceId, transport.id, "vehicle");

  if (properties.length === 0) {
    throw new Error(
      "Najprv pridajte aspoň jednu nehnuteľnosť — vzorové dáta sa priraďujú k existujúcim položkám",
    );
  }
  if (vehicles.length === 0) {
    throw new Error(
      "Najprv pridajte aspoň jedno vozidlo — vzorové dáta sa priraďujú k existujúcim položkám",
    );
  }

  const primaryProperty = properties[0]!;
  const secondaryProperty = properties[1] ?? properties[0]!;
  const primaryVehicle = vehicles[0]!;
  const secondaryVehicle = vehicles[1] ?? vehicles[0]!;

  const catHome =
    cats.find((c) => c.name === "Domácnosť")?.id ?? cats[0]?.id;
  const catAuto = cats.find((c) => c.name === "Auto")?.id ?? cats[0]?.id;
  if (!catHome || !catAuto) {
    throw new Error("Chýbajú kategórie vo workspace");
  }

  const [zseId, sppId, telekomId] = await Promise.all([
    findVendorId("zse"),
    findVendorId("spp"),
    findVendorId("slovak-telekom"),
  ]);

  const today = new Date();
  const thisMonth15 = iso(addMonths(today, 0, 15));
  const nextMonth5 = iso(addMonths(today, 1, 5));
  const nextMonth10 = iso(addMonths(today, 1, 10));
  const nextMonth20 = iso(addMonths(today, 1, 20));
  const in14 = iso(addDays(today, 14));
  const in30 = iso(addDays(today, 30));
  const in45 = iso(addDays(today, 45));
  const in60 = iso(addDays(today, 60));
  const lastWeek = iso(addDays(today, -7));
  const lastMonth = iso(addMonths(today, -1, 12));

  const primaryServices = await getPropertyServices(
    workspaceId,
    primaryProperty.id,
  );
  const secondaryServices = await getPropertyServices(
    workspaceId,
    secondaryProperty.id,
  );

  let servicesCreated = 0;

  const hiddenTypes = (property: ItemRow) => {
    const raw = (property.attributes as Record<string, unknown> | null)
      ?.hiddenServiceTypes;
    return Array.isArray(raw)
      ? new Set(raw.filter((v): v is string => typeof v === "string"))
      : new Set<string>();
  };

  const ensure = async (
    property: ItemRow,
    existing: ItemRow[],
    name: string,
    serviceType: string,
    vendorId?: string | null,
  ) => {
    const existingMatch = existing.find(
      (s) =>
        (s.attributes as Record<string, unknown> | null)?.serviceType ===
        serviceType,
    );
    if (existingMatch) return existingMatch;

    // Don't create services the user hid — attach payments to the property.
    if (hiddenTypes(property).has(serviceType)) {
      return property;
    }

    const result = await ensureService({
      workspaceId,
      moduleId: household.id,
      propertyId: property.id,
      name,
      serviceType,
      existing,
      vendorId,
    });
    if (result.created) {
      servicesCreated++;
      existing.push(result.item);
    }
    return result.item;
  };

  const pElectricity = await ensure(
    primaryProperty,
    primaryServices,
    "Elektrina",
    "electricity",
    zseId,
  );
  const pWater = await ensure(
    primaryProperty,
    primaryServices,
    "Voda",
    "water",
  );
  const pGas = await ensure(
    primaryProperty,
    primaryServices,
    "Plyn",
    "gas",
    sppId,
  );
  const pInternet = await ensure(
    primaryProperty,
    primaryServices,
    "Internet",
    "internet",
    telekomId,
  );
  const pWaste = await ensure(
    primaryProperty,
    primaryServices,
    "Odpad",
    "waste",
  );

  const sElectricity = await ensure(
    secondaryProperty,
    secondaryServices,
    "Elektrina",
    "electricity",
    zseId,
  );
  const sWater = await ensure(
    secondaryProperty,
    secondaryServices,
    "Voda",
    "water",
  );

  type PaymentSeed = {
    title: string;
    amount: string;
    categoryId: string;
    moduleId: string;
    itemId: string;
    date: string;
    status: "actual" | "planned";
    note?: string;
  };

  const note = (extra?: string) =>
    extra ? `${DEMO_NOTE} ${extra}` : DEMO_NOTE;

  const payments: PaymentSeed[] = [
    {
      title: `Záloha elektrina – ${primaryProperty.name}`,
      amount: "85.00",
      categoryId: catHome,
      moduleId: household.id,
      itemId: pElectricity.id,
      date: thisMonth15,
      status: "planned",
    },
    {
      title: `Záloha elektrina – ${primaryProperty.name}`,
      amount: "82.40",
      categoryId: catHome,
      moduleId: household.id,
      itemId: pElectricity.id,
      date: lastMonth,
      status: "actual",
    },
    {
      title: `Vodné a stočné – ${primaryProperty.name}`,
      amount: "28.50",
      categoryId: catHome,
      moduleId: household.id,
      itemId: pWater.id,
      date: nextMonth5,
      status: "planned",
    },
    {
      title: `Záloha plyn – ${primaryProperty.name}`,
      amount: "62.00",
      categoryId: catHome,
      moduleId: household.id,
      itemId: pGas.id,
      date: thisMonth15,
      status: "planned",
    },
    {
      title: `Internet – ${primaryProperty.name}`,
      amount: "29.99",
      categoryId: catHome,
      moduleId: household.id,
      itemId: pInternet.id,
      date: nextMonth10,
      status: "planned",
    },
    {
      title: `Poplatok za odpad – ${primaryProperty.name}`,
      amount: "18.00",
      categoryId: catHome,
      moduleId: household.id,
      itemId: pWaste.id,
      date: nextMonth20,
      status: "planned",
    },
    {
      title: `Záloha elektrina – ${secondaryProperty.name}`,
      amount: "45.00",
      categoryId: catHome,
      moduleId: household.id,
      itemId: sElectricity.id,
      date: thisMonth15,
      status: "planned",
    },
    {
      title: `Vodné – ${secondaryProperty.name}`,
      amount: "19.80",
      categoryId: catHome,
      moduleId: household.id,
      itemId: sWater.id,
      date: nextMonth5,
      status: "planned",
    },
    {
      title: `Povinné zmluvné poistenie – ${primaryVehicle.name}`,
      amount: "22.50",
      categoryId: catAuto,
      moduleId: transport.id,
      itemId: primaryVehicle.id,
      date: thisMonth15,
      status: "planned",
      note: "Allianz mesačná splátka",
    },
    {
      title: `Pohonné hmoty – ${primaryVehicle.name}`,
      amount: "54.20",
      categoryId: catAuto,
      moduleId: transport.id,
      itemId: primaryVehicle.id,
      date: lastWeek,
      status: "actual",
    },
    {
      title: `Parkovanie – ${primaryVehicle.name}`,
      amount: "35.00",
      categoryId: catAuto,
      moduleId: transport.id,
      itemId: primaryVehicle.id,
      date: nextMonth5,
      status: "planned",
    },
    {
      title: `Servis – výmena oleja – ${primaryVehicle.name}`,
      amount: "89.00",
      categoryId: catAuto,
      moduleId: transport.id,
      itemId: primaryVehicle.id,
      date: in30,
      status: "planned",
    },
    {
      title: `Servis – ${secondaryVehicle.name}`,
      amount: "45.00",
      categoryId: catAuto,
      moduleId: transport.id,
      itemId: secondaryVehicle.id,
      date: in45,
      status: "planned",
    },
    {
      title: `Poistenie – ${secondaryVehicle.name}`,
      amount: "8.90",
      categoryId: catAuto,
      moduleId: transport.id,
      itemId: secondaryVehicle.id,
      date: nextMonth10,
      status: "planned",
    },
  ];

  await db.insert(transactions).values(
    payments.map((p) => ({
      id: createId("txn"),
      workspaceId,
      categoryId: p.categoryId,
      moduleId: p.moduleId,
      itemId: p.itemId,
      createdByUserId: userId,
      title: p.title,
      amount: p.amount,
      type: "expense" as const,
      status: p.status,
      date: p.date,
      note: note(p.note),
    })),
  );

  type EventSeed = {
    title: string;
    eventDate: string;
    type: "deadline" | "event" | "reminder";
    moduleId: string;
    itemId: string;
    note?: string;
  };

  const events: EventSeed[] = [
    {
      title: `Odpočet elektromera – ${primaryProperty.name}`,
      eventDate: in14,
      type: "deadline",
      moduleId: household.id,
      itemId: pElectricity.id,
      note: "Self-reading v zákazníckej zóne",
    },
    {
      title: `Odpočet plynu – ${primaryProperty.name}`,
      eventDate: in30,
      type: "deadline",
      moduleId: household.id,
      itemId: pGas.id,
    },
    {
      title: `Vyúčtovanie odpadu – ${primaryProperty.name}`,
      eventDate: nextMonth20,
      type: "reminder",
      moduleId: household.id,
      itemId: pWaste.id,
    },
    {
      title: `Odpočet elektromera – ${secondaryProperty.name}`,
      eventDate: in45,
      type: "deadline",
      moduleId: household.id,
      itemId: sElectricity.id,
    },
    {
      title: `STK a emisná kontrola – ${primaryVehicle.name}`,
      eventDate: in45,
      type: "deadline",
      moduleId: transport.id,
      itemId: primaryVehicle.id,
      note: "Platnosť končí o 1,5 mesiaca",
    },
    {
      title: `Obnova PZP – ${primaryVehicle.name}`,
      eventDate: in60,
      type: "deadline",
      moduleId: transport.id,
      itemId: primaryVehicle.id,
    },
    {
      title: `Servis – výmena oleja – ${primaryVehicle.name}`,
      eventDate: in30,
      type: "reminder",
      moduleId: transport.id,
      itemId: primaryVehicle.id,
    },
    {
      title: `Servis – ${secondaryVehicle.name}`,
      eventDate: in45,
      type: "reminder",
      moduleId: transport.id,
      itemId: secondaryVehicle.id,
    },
  ];

  await db.insert(calendarEvents).values(
    events.map((e) => ({
      id: createId("evt"),
      workspaceId,
      moduleId: e.moduleId,
      itemId: e.itemId,
      title: e.title,
      eventDate: e.eventDate,
      type: e.type,
      note: note(e.note),
      createdByUserId: userId,
    })),
  );

  return {
    seeded: true,
    properties: properties.length >= 2 ? 2 : 1,
    vehicles: vehicles.length >= 2 ? 2 : 1,
    services: servicesCreated,
    payments: payments.length,
    events: events.length,
  };
}
