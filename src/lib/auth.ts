import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createId } from "@/lib/id";

export async function requireAuth() {
  const session = await auth();
  if (!session.userId) {
    throw new Error("Neprihlásený používateľ");
  }
  return session;
}

export async function ensureDbUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    throw new Error("Neprihlásený používateľ");
  }

  const email =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress ??
    `${clerkUser.id}@users.clerk`;
  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    clerkUser.username ||
    email;

  const existing = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkUser.id),
  });
  if (existing) {
    if (existing.email !== email || existing.name !== name) {
      const [updated] = await db
        .update(users)
        .set({ email, name })
        .where(eq(users.id, existing.id))
        .returning();
      return updated ?? existing;
    }
    return existing;
  }

  try {
    const [created] = await db
      .insert(users)
      .values({
        id: createId("usr"),
        clerkId: clerkUser.id,
        email,
        name,
      })
      .returning();
    return created;
  } catch {
    const raced = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkUser.id),
    });
    if (!raced) {
      throw new Error("Nepodarilo sa vytvoriť používateľa");
    }
    return raced;
  }
}
