"use client";

import { useTransition } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { deleteDocumentAction } from "@/actions/documents";
import { Button } from "@/components/ui/button";
import { blobProxyUrl } from "@/lib/blob";

export type DocumentRow = {
  id: string;
  title: string;
  fileName: string;
  size: number;
  blobUrl: string;
  createdAt: Date | string;
  itemId?: string | null;
  module?: { slug: string } | null;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentList({
  items,
  workspaceId,
  showItemLink = true,
}: {
  items: DocumentRow[];
  workspaceId: string;
  showItemLink?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  if (items.length === 0) return null;

  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-card">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-3 px-3 py-3">
          <FileText className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <a
              href={blobProxyUrl(item.blobUrl) ?? item.blobUrl}
              target="_blank"
              rel="noreferrer"
              className="truncate text-sm font-medium hover:underline"
            >
              {item.title}
            </a>
            <p className="text-xs text-muted-foreground">
              {item.fileName} · {formatSize(item.size)}
              {showItemLink && item.itemId ? (
                <>
                  {" · "}
                  <Link
                    href={`/items/${item.itemId}`}
                    className="hover:underline"
                  >
                    ← k položke
                  </Link>
                </>
              ) : null}
            </p>
          </div>
          <Button
            size="xs"
            variant="ghost"
            disabled={pending}
            onClick={() =>
              startTransition(() => deleteDocumentAction(item.id, workspaceId))
            }
          >
            Zmazať
          </Button>
        </li>
      ))}
    </ul>
  );
}
