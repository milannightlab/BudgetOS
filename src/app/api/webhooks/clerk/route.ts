import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createId } from "@/lib/id";

type ClerkEmail = { email_address: string };
type ClerkEvent = {
  type: string;
  data: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    username?: string | null;
    email_addresses?: ClerkEmail[];
    primary_email_address_id?: string | null;
  };
};

export async function POST(req: Request) {
  const payload = (await req.json()) as ClerkEvent;

  if (payload.type !== "user.created" && payload.type !== "user.updated") {
    return NextResponse.json({ ok: true });
  }

  const email =
    payload.data.email_addresses?.[0]?.email_address ??
    `${payload.data.id}@users.clerk`;
  const name =
    [payload.data.first_name, payload.data.last_name].filter(Boolean).join(" ") ||
    payload.data.username ||
    email;

  const existing = await db.query.users.findFirst({
    where: eq(users.clerkId, payload.data.id),
  });

  if (existing) {
    await db
      .update(users)
      .set({ email, name })
      .where(eq(users.id, existing.id));
  } else {
    await db.insert(users).values({
      id: createId("usr"),
      clerkId: payload.data.id,
      email,
      name,
    });
  }

  return NextResponse.json({ ok: true });
}
