import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

async function main() {
  const { db } = await import("../src/db");
  const { workspaceMembers, workspaces } = await import("../src/db/schema");
  const { seedDemoWorkspaceData } = await import("../src/db/seed-demo");
  const { eq } = await import("drizzle-orm");

  const all = await db.select({ id: workspaces.id, name: workspaces.name }).from(
    workspaces,
  );
  if (all.length === 0) {
    console.error("Žiadny workspace v databáze.");
    process.exit(1);
  }

  for (const ws of all) {
    const owner = await db.query.workspaceMembers.findFirst({
      where: eq(workspaceMembers.workspaceId, ws.id),
      columns: { userId: true, role: true },
    });
    if (!owner) {
      console.warn(`Preskakujem ${ws.name}: bez člena`);
      continue;
    }
    const result = await seedDemoWorkspaceData(ws.id, owner.userId);
    console.log(ws.name, result);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
