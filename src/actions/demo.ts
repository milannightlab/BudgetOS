"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { seedDemoWorkspaceData } from "@/db/seed-demo";
import { ensureDbUser } from "@/lib/auth";
import { requireWorkspaceAccess } from "@/lib/workspace";

export async function seedDemoDataAction(workspaceId: string) {
  const parsedWorkspaceId = z.string().min(1).parse(workspaceId);
  const user = await ensureDbUser();
  const membership = await requireWorkspaceAccess(
    parsedWorkspaceId,
    user.id,
  );
  if (membership.role !== "owner") {
    throw new Error("Vzorové dáta môže načítať len vlastník workspace");
  }

  const result = await seedDemoWorkspaceData(parsedWorkspaceId, user.id);

  revalidatePath("/");
  revalidatePath("/modules", "layout");
  revalidatePath("/modules/household");
  revalidatePath("/modules/transport");
  revalidatePath("/transactions");
  revalidatePath("/planned");

  return result;
}
