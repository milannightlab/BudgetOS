"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive } from "lucide-react";
import { archiveItemAction } from "@/actions/items";
import { Button } from "@/components/ui/button";

export function ArchiveItemButton({
  itemId,
  workspaceId,
  moduleSlug,
}: {
  itemId: string;
  workspaceId: string;
  moduleSlug: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="outline"
      className="gap-1"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await archiveItemAction(itemId, workspaceId);
          router.push(`/modules/${moduleSlug}`);
          router.refresh();
        });
      }}
    >
      <Archive className="size-4" />
      {pending ? "Archivujem…" : "Archivovať"}
    </Button>
  );
}
