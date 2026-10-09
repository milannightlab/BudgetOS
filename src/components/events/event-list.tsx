"use client";

import { useTransition } from "react";
import Link from "next/link";
import { deleteEventAction } from "@/actions/events";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const typeLabel = {
  deadline: "Termín",
  event: "Udalosť",
  reminder: "Pripomienka",
} as const;

export type EventRow = {
  id: string;
  title: string;
  eventDate: string;
  type: "deadline" | "event" | "reminder";
  note: string | null;
  itemId?: string | null;
  module?: { slug: string } | null;
};

export function EventList({
  items,
  workspaceId,
  showItemLink = true,
}: {
  items: EventRow[];
  workspaceId: string;
  showItemLink?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  if (items.length === 0) return null;

  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-card">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-3 px-3 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-medium">{item.title}</p>
              <Badge variant="secondary">{typeLabel[item.type]}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {item.eventDate}
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
            {item.note ? (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {item.note}
              </p>
            ) : null}
          </div>
          <Button
            size="xs"
            variant="ghost"
            disabled={pending}
            onClick={() =>
              startTransition(() => deleteEventAction(item.id, workspaceId))
            }
          >
            Zmazať
          </Button>
        </li>
      ))}
    </ul>
  );
}
