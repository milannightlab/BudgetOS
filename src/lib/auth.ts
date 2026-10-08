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

  const existing = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkUser.id),
  });
  if (existing) {
    return existing;
  }

  const email =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress ??
    `${clerkUser.id}@users.clerk`;
  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    clerkUser.username ||
    email;

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
}
