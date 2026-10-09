"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { ensureDbUser } from "@/lib/auth";
import { deletePrivateBlob, putPrivateBlob } from "@/lib/blob";
import { linkEntities } from "@/lib/entity-links";
import { createId } from "@/lib/id";
import { requireWorkspaceAccess } from "@/lib/workspace";

const MAX_BYTES = 10 * 1024 * 1024;

export async function uploadDocumentAction(formData: FormData) {
  const workspaceId = z.string().parse(formData.get("workspaceId"));
  const title = z
    .string()
    .trim()
    .min(1)
    .max(160)
    .parse(formData.get("title") || formData.get("fileName") || "Dokument");
  const moduleRaw = formData.get("moduleId");
  const moduleId = moduleRaw ? String(moduleRaw) : null;
  const itemRaw = formData.get("itemId");
  const itemId = itemRaw ? String(itemRaw) : null;
  const linkEventId = formData.get("linkEventId");
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Vyberte súbor");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Súbor môže mať max. 10 MB");
  }

  const user = await ensureDbUser();
  await requireWorkspaceAccess(workspaceId, user.id);

  const blob = await putPrivateBlob(
    `workspaces/${workspaceId}/${Date.now()}-${file.name}`,
    file,
  );

  const [doc] = await db
    .insert(documents)
    .values({
      id: createId("doc"),
      workspaceId,
      moduleId: moduleId || null,
      itemId: itemId || null,
      title,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      blobUrl: blob.url,
      uploadedByUserId: user.id,
    })
    .returning();

  if (linkEventId && typeof linkEventId === "string" && linkEventId.length > 0) {
    await linkEntities({
      workspaceId,
      fromType: "document",
      fromId: doc.id,
      toType: "calendar_event",
      toId: linkEventId,
    });
  }

  revalidatePath("/");
  revalidatePath("/modules", "layout");
  if (itemId) revalidatePath(`/items/${itemId}`);
  return { id: doc.id };
}

export async function deleteDocumentAction(id: string, workspaceId: string) {
  const user = await ensureDbUser();
  await requireWorkspaceAccess(workspaceId, user.id);

  const doc = await db.query.documents.findFirst({
    where: and(eq(documents.id, id), eq(documents.workspaceId, workspaceId)),
  });
  if (!doc) return;

  await deletePrivateBlob(doc.blobUrl);

  await db
    .delete(documents)
    .where(and(eq(documents.id, id), eq(documents.workspaceId, workspaceId)));

  revalidatePath("/");
  revalidatePath("/modules", "layout");
}
