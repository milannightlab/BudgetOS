import { NextResponse } from "next/server";
import { ensureDbUser } from "@/lib/auth";
import {
  getPrivateBlob,
  isVercelBlobUrl,
  workspaceIdFromBlobUrl,
} from "@/lib/blob";
import { requireWorkspaceAccess } from "@/lib/workspace";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url || !isVercelBlobUrl(url)) {
    return NextResponse.json({ error: "Neplatná URL" }, { status: 400 });
  }

  const workspaceId = workspaceIdFromBlobUrl(url);
  if (!workspaceId) {
    return NextResponse.json({ error: "Neplatná cesta" }, { status: 400 });
  }

  try {
    const user = await ensureDbUser();
    await requireWorkspaceAccess(workspaceId, user.id);
  } catch {
    return NextResponse.json({ error: "Nepovolený prístup" }, { status: 401 });
  }

  const result = await getPrivateBlob(url);
  if (!result || result.statusCode !== 200 || !result.stream) {
    return NextResponse.json({ error: "Súbor neexistuje" }, { status: 404 });
  }

  const headers = new Headers();
  headers.set(
    "Content-Type",
    result.blob.contentType || "application/octet-stream",
  );
  headers.set("Cache-Control", "private, max-age=3600");
  if (result.blob.size != null) {
    headers.set("Content-Length", String(result.blob.size));
  }

  return new NextResponse(result.stream, { headers });
}
