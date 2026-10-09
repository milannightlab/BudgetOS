import { get, put, del } from "@vercel/blob";

const BLOB_HOST_HINT = "blob.vercel-storage.com";

export function requireBlobToken() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN nie je nastavený. Pridajte Vercel Blob token do .env.local.",
    );
  }
  return token;
}

export async function putPrivateBlob(pathname: string, file: File) {
  return put(pathname, file, {
    access: "private",
    token: requireBlobToken(),
  });
}

export async function deletePrivateBlob(url: string) {
  try {
    await del(url, { token: requireBlobToken() });
  } catch {
    // ignore missing blob
  }
}

/** App-relative URL that streams a private blob after auth. */
export function blobProxyUrl(blobUrl: string | null | undefined) {
  if (!blobUrl) return null;
  return `/api/blob?url=${encodeURIComponent(blobUrl)}`;
}

export function isVercelBlobUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.includes(BLOB_HOST_HINT);
  } catch {
    return false;
  }
}

/** Extract workspace id from our upload path convention: workspaces/{workspaceId}/... */
export function workspaceIdFromBlobUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    // pathname often: /<storeId>/workspaces/<workspaceId>/...
    const idx = parts.indexOf("workspaces");
    if (idx >= 0 && parts[idx + 1]) return parts[idx + 1] ?? null;
    return null;
  } catch {
    return null;
  }
}

export async function getPrivateBlob(url: string) {
  return get(url, {
    access: "private",
    token: requireBlobToken(),
  });
}
