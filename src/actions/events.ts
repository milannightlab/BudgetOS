"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { calendarEvents } from "@/db/schema";
import { ensureDbUser } from "@/lib/auth";
import { createId } from "@/lib/id";
import { requireWorkspaceAccess } from "@/lib/workspace";

const eventSchema = z.object({
  workspaceId: z.string().min(1),
  moduleId: z.string().optional().nullable(),
  itemId: z.string().optional().nullable(),
  title: z.string().trim().min(1).max(160),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(["deadline", "event", "reminder"]).default("deadline"),
  note: z.string().trim().max(1000).optional().nullable(),
});

export async function createEventAction(formData: FormData) {
  const moduleRaw = formData.get("moduleId");
  const itemRaw = formData.get("itemId");
  const parsed = eventSchema.parse({
    workspaceId: formData.get("workspaceId"),
    moduleId: moduleRaw ? String(moduleRaw) : null,
    itemId: itemRaw ? String(itemRaw) : null,
    title: formData.get("title"),
    eventDate: formData.get("eventDate"),
    type: formData.get("type") || "deadline",
    note: formData.get("note") || null,
  });

  const user = await ensureDbUser();
  await requireWorkspaceAccess(parsed.workspaceId, user.id);

  await db.insert(calendarEvents).values({
    id: createId("evt"),
    workspaceId: parsed.workspaceId,
    moduleId: parsed.moduleId || null,
    itemId: parsed.itemId || null,
    title: parsed.title,
    eventDate: parsed.eventDate,
    type: parsed.type,
    note: parsed.note,
    createdByUserId: user.id,
  });

  revalidatePath("/");
  revalidatePath("/modules", "layout");
  if (parsed.itemId) revalidatePath(`/items/${parsed.itemId}`);
}

export async function setEventCompletedAction(
  id: string,
  workspaceId: string,
  completed: boolean,
) {
  const user = await ensureDbUser();
  await requireWorkspaceAccess(workspaceId, user.id);

  await db
    .update(calendarEvents)
    .set({ completed })
    .where(
      and(
        eq(calendarEvents.id, id),
        eq(calendarEvents.workspaceId, workspaceId),
      ),
    );

  revalidatePath("/");
  revalidatePath("/modules", "layout");
  revalidatePath("/calendar");
}

export async function deleteEventAction(id: string, workspaceId: string) {
  const user = await ensureDbUser();
  await requireWorkspaceAccess(workspaceId, user.id);

  await db
    .delete(calendarEvents)
    .where(
      and(
        eq(calendarEvents.id, id),
        eq(calendarEvents.workspaceId, workspaceId),
      ),
    );

  revalidatePath("/");
  revalidatePath("/modules", "layout");
  revalidatePath("/calendar");
}
