import { NextResponse } from "next/server";
import { expandRecurringPayments } from "@/lib/recurring";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const created = await expandRecurringPayments();
  return NextResponse.json({ ok: true, created });
}
