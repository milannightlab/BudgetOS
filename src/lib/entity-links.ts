import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { entityLinks } from "@/db/schema";
import { createId } from "@/lib/id";

type EntityType =
  | "document"
  | "calendar_event"
  | "transaction"
  | "recurring_payment"
  | "module";

export async function linkEntities(params: {
  workspaceId: string;
  fromType: EntityType;
  fromId: string;
  toType: EntityType;
  toId: string;
}) {
  try {
    const [row] = await db
      .insert(entityLinks)
      .values({
        id: createId("lnk"),
        workspaceId: params.workspaceId,
        fromType: params.fromType,
        fromId: params.fromId,
        toType: params.toType,
        toId: params.toId,
      })
      .returning();
    return row;
  } catch {
    return undefined;
  }
}

export async function getLinked(
  workspaceId: string,
  type: EntityType,
  id: string,
) {
  return db.query.entityLinks.findMany({
    where: and(
      eq(entityLinks.workspaceId, workspaceId),
      or(
        and(eq(entityLinks.fromType, type), eq(entityLinks.fromId, id)),
        and(eq(entityLinks.toType, type), eq(entityLinks.toId, id)),
      ),
    ),
  });
}
