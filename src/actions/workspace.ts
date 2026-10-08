"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import {
  workspaceInvites,
  workspaceMembers,
  workspaces,
} from "@/db/schema";
import { ensureDbUser } from "@/lib/auth";
import { createId } from "@/lib/id";
import {
  WORKSPACE_COOKIE,
  createWorkspace,
  requireWorkspaceAccess,
} from "@/lib/workspace";

const nameSchema = z.string().trim().min(2).max(80);

export async function createWorkspaceAction(formData: FormData) {
  const name = nameSchema.parse(formData.get("name"));
  const user = await ensureDbUser();
  const workspaceId = await createWorkspace(name, user.id);

  const cookieStore = await cookies();
  cookieStore.set(WORKSPACE_COOKIE, workspaceId, {
    path: "/",
    sameSite: "lax",
  });

  revalidatePath("/");
  return { workspaceId };
}

export async function switchWorkspaceAction(workspaceId: string) {
  const user = await ensureDbUser();
  await requireWorkspaceAccess(workspaceId, user.id);
  const cookieStore = await cookies();
  cookieStore.set(WORKSPACE_COOKIE, workspaceId, {
    path: "/",
    sameSite: "lax",
  });
  revalidatePath("/");
}

export async function inviteMemberAction(formData: FormData) {
  const email = z.string().email().parse(String(formData.get("email")).toLowerCase());
  const workspaceId = z.string().parse(formData.get("workspaceId"));
  const user = await ensureDbUser();
  const membership = await requireWorkspaceAccess(workspaceId, user.id);
  if (membership.role !== "owner") {
    throw new Error("Len vlastník môže pozývať členov");
  }

  const token = createId("inv");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 14);

  await db.insert(workspaceInvites).values({
    id: createId("invite"),
    workspaceId,
    email,
    token,
    status: "pending",
    invitedByUserId: user.id,
    expiresAt,
  });

  revalidatePath("/settings");
  return { token };
}

export async function acceptInviteAction(token: string) {
  const user = await ensureDbUser();
  const invite = await db.query.workspaceInvites.findFirst({
    where: and(
      eq(workspaceInvites.token, token),
      eq(workspaceInvites.status, "pending"),
    ),
  });

  if (!invite || invite.expiresAt < new Date()) {
    throw new Error("Pozvánka je neplatná alebo expirovaná");
  }

  if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
    throw new Error("Táto pozvánka je určená pre iný e-mail");
  }

  const existing = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, invite.workspaceId),
      eq(workspaceMembers.userId, user.id),
    ),
  });

  if (!existing) {
    await db.insert(workspaceMembers).values({
      id: createId("wsm"),
      workspaceId: invite.workspaceId,
      userId: user.id,
      role: "member",
    });
  }

  await db
    .update(workspaceInvites)
    .set({ status: "accepted" })
    .where(eq(workspaceInvites.id, invite.id));

  const cookieStore = await cookies();
  cookieStore.set(WORKSPACE_COOKIE, invite.workspaceId, {
    path: "/",
    sameSite: "lax",
  });

  revalidatePath("/");
  return { workspaceId: invite.workspaceId };
}

export async function renameWorkspaceAction(formData: FormData) {
  const workspaceId = z.string().parse(formData.get("workspaceId"));
  const name = nameSchema.parse(formData.get("name"));
  const user = await ensureDbUser();
  const membership = await requireWorkspaceAccess(workspaceId, user.id);
  if (membership.role !== "owner") {
    throw new Error("Len vlastník môže premenovať workspace");
  }

  await db.update(workspaces).set({ name }).where(eq(workspaces.id, workspaceId));
  revalidatePath("/settings");
  revalidatePath("/");
}
