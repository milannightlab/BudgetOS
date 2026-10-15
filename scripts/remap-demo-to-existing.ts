import { config } from "dotenv";
import { resolve } from "node:path";
import { and, eq, inArray, or } from "drizzle-orm";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

async function main() {
  const { db } = await import("../src/db");
  const {
    calendarEvents,
    itemRelations,
    items,
    transactions,
  } = await import("../src/db/schema");
  const { createId } = await import("../src/lib/id");

  const workspaceId = "ws_349043e6-57ee-4dfe-8649-8e4a43f26793";

  const allItems = await db.query.items.findMany({
    where: eq(items.workspaceId, workspaceId),
  });
  const isDemo = (i: (typeof allItems)[number]) =>
    (i.attributes as Record<string, unknown> | null)?.demoSeed === true;

  const real = allItems.filter((i) => !isDemo(i));
  const demo = allItems.filter(isDemo);

  const mad = real.find((i) => i.type === "property" && i.name === "MAD House");
  const brloh = real.find((i) => i.type === "property" && i.name === "Brloh");
  const nissan = real.find(
    (i) => i.type === "vehicle" && i.name.includes("Nissan"),
  );
  const toyota = real.find(
    (i) => i.type === "vehicle" && i.name.includes("Toyota"),
  );

  if (!mad || !brloh || !nissan || !toyota) {
    throw new Error("Chýbajú existujúce nehnuteľnosti alebo vozidlá");
  }

  const rels = await db.query.itemRelations.findMany({
    where: eq(itemRelations.workspaceId, workspaceId),
  });

  function serviceOf(propertyId: string, serviceType: string, demoOnly: boolean) {
    for (const r of rels) {
      if (r.targetItemId !== propertyId) continue;
      const svc = allItems.find((i) => i.id === r.sourceItemId);
      if (!svc) continue;
      if (isDemo(svc) !== demoOnly) continue;
      if (
        (svc.attributes as Record<string, unknown> | null)?.serviceType ===
        serviceType
      ) {
        return svc;
      }
    }
    return null;
  }

  let brlohWater = serviceOf(brloh.id, "water", false);
  if (!brlohWater) {
    const id = createId("itm");
    await db.insert(items).values({
      id,
      workspaceId,
      moduleId: brloh.moduleId,
      type: "property_service",
      name: "Voda",
      status: "active",
      sortOrder: 1,
      attributes: { serviceType: "water" },
    });
    await db.insert(itemRelations).values({
      id: createId("irl"),
      workspaceId,
      sourceItemId: id,
      targetItemId: brloh.id,
      relationType: "belongs_to",
    });
    brlohWater = { id } as (typeof allItems)[number];
    console.log("created Brloh water", id);
  }

  const madEl = serviceOf(mad.id, "electricity", false);
  const madWater = serviceOf(mad.id, "water", false);
  const madNet = serviceOf(mad.id, "internet", false);
  const madWaste = serviceOf(mad.id, "waste", false);
  const brlohEl = serviceOf(brloh.id, "electricity", false);

  if (!madEl || !madWater || !madNet || !madWaste || !brlohEl) {
    throw new Error("Chýbajú služby na existujúcich nehnuteľnostiach");
  }

  const demoHouse = demo.find(
    (i) => i.type === "property" && i.name.includes("Dúbravka"),
  );
  const demoApt = demo.find(
    (i) => i.type === "property" && i.name.includes("Karlova"),
  );
  const demoOctavia = demo.find(
    (i) => i.type === "vehicle" && i.name.includes("Octavia"),
  );
  const demoBike = demo.find(
    (i) => i.type === "vehicle" && i.name.includes("Trek"),
  );

  if (!demoHouse || !demoApt || !demoOctavia || !demoBike) {
    throw new Error("Demo položky už nie sú v DB — možno už boli odstránené");
  }

  function requireDemoService(propertyId: string, serviceType: string) {
    const svc = serviceOf(propertyId, serviceType, true);
    if (!svc) throw new Error(`Demo služba ${serviceType} na ${propertyId}`);
    return svc;
  }

  /** null = delete related payments/events */
  const remap = new Map<string, string | null>([
    [requireDemoService(demoHouse.id, "electricity").id, madEl.id],
    [requireDemoService(demoHouse.id, "water").id, madWater.id],
    [requireDemoService(demoHouse.id, "gas").id, mad.id],
    [requireDemoService(demoHouse.id, "internet").id, madNet.id],
    [requireDemoService(demoHouse.id, "waste").id, madWaste.id],
    [requireDemoService(demoApt.id, "electricity").id, brlohEl.id],
    [requireDemoService(demoApt.id, "water").id, brlohWater.id],
    [requireDemoService(demoApt.id, "internet").id, brloh.id],
    [requireDemoService(demoApt.id, "building_manager").id, null],
    [requireDemoService(demoApt.id, "repair_fund").id, null],
    [demoOctavia.id, nissan.id],
    [demoBike.id, toyota.id],
    [demoHouse.id, null],
    [demoApt.id, null],
  ]);

  const txns = await db.query.transactions.findMany({
    where: eq(transactions.workspaceId, workspaceId),
  });
  let movedTxn = 0;
  let deletedTxn = 0;
  for (const t of txns) {
    if (!t.itemId || !remap.has(t.itemId)) continue;
    const target = remap.get(t.itemId)!;
    if (target === null) {
      await db.delete(transactions).where(eq(transactions.id, t.id));
      deletedTxn++;
      continue;
    }
    let title = t.title;
    if (t.itemId === demoBike.id) {
      title = title
        .replace(/bicykla/gi, "auta")
        .replace(/bicykel/gi, "auto");
    }
    title = title
      .replace(" – dom", " – MAD House")
      .replace(" – byt", " – Brloh");
    await db
      .update(transactions)
      .set({ itemId: target, title })
      .where(eq(transactions.id, t.id));
    movedTxn++;
  }

  const evts = await db.query.calendarEvents.findMany({
    where: eq(calendarEvents.workspaceId, workspaceId),
  });
  let movedEvt = 0;
  let deletedEvt = 0;
  for (const e of evts) {
    if (!e.itemId || !remap.has(e.itemId)) continue;
    const target = remap.get(e.itemId)!;
    if (target === null) {
      await db.delete(calendarEvents).where(eq(calendarEvents.id, e.id));
      deletedEvt++;
      continue;
    }
    let title = e.title;
    if (e.itemId === demoBike.id) {
      title = title.replace(/bicykla/gi, "auta");
    }
    title = title
      .replace(" – dom", " – MAD House")
      .replace(" – byt", " – Brloh");
    await db
      .update(calendarEvents)
      .set({ itemId: target, title })
      .where(eq(calendarEvents.id, e.id));
    movedEvt++;
  }

  const demoIds = demo.map((i) => i.id);

  await db
    .delete(itemRelations)
    .where(
      and(
        eq(itemRelations.workspaceId, workspaceId),
        or(
          inArray(itemRelations.sourceItemId, demoIds),
          inArray(itemRelations.targetItemId, demoIds),
        ),
      ),
    );

  await db
    .delete(items)
    .where(and(eq(items.workspaceId, workspaceId), inArray(items.id, demoIds)));

  console.log({
    movedTxn,
    deletedTxn,
    movedEvt,
    deletedEvt,
    deletedItems: demoIds.length,
    targets: {
      mad: mad.name,
      brloh: brloh.name,
      nissan: nissan.name,
      toyota: toyota.name,
    },
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
