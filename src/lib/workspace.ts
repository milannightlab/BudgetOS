import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { DEFAULT_CATEGORIES } from "@/db/seed-categories";
import {
  categories,
  workspaceMembers,
  workspaces,
} from "@/db/schema";
import { ensureDbUser } from "@/lib/auth";
import { createId } from "@/lib/id";
import { seedWorkspaceModules } from "@/lib/modules";

export const WORKSPACE_COOKIE = "budgetos_workspace_id";

export async function createWorkspace(name: string, ownerUserId: string) {
  const workspaceId = createId("ws");
  await db.insert(workspaces).values({
    id: workspaceId,
    name,
    currency: "EUR",
  });

  await db.insert(workspaceMembers).values({
    id: createId("wsm"),
    workspaceId,
    userId: ownerUserId,
    role: "owner",
  });

  await seedWorkspaceModules(workspaceId);

  await db.insert(categories).values(
    DEFAULT_CATEGORIES.map((category) => ({
      id: createId("cat"),
      workspaceId,
      name: category.name,
      icon: category.icon,
      color: category.color,
      isDefault: true,
    })),
  );

  return workspaceId;
}

export async function getUserWorkspaces(userId: string) {
  const memberships = await db.query.workspaceMembers.findMany({
    where: eq(workspaceMembers.userId, userId),
    with: { workspace: true },
  });
  return memberships.map((m) => ({
    ...m.workspace,
    role: m.role,
  }));
}

export async function requireWorkspaceAccess(workspaceId: string, userId: string) {
  const membership = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, userId),
    ),
  });
  if (!membership) {
    throw new Error("Nemáte prístup k tomuto workspace");
  }
  return membership;
}

export async function getActiveWorkspace() {
  const user = await ensureDbUser();
  const list = await getUserWorkspaces(user.id);
  if (list.length === 0) {
    return { user, workspaces: list, workspace: null as null };
  }

  const cookieStore = await cookies();
  const preferred = cookieStore.get(WORKSPACE_COOKIE)?.value;
  const workspace =
    list.find((w) => w.id === preferred) ?? list[0] ?? null;

  return { user, workspaces: list, workspace };
}
