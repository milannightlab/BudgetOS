"use client";

import { useTransition } from "react";
import {
  deleteRecurringAction,
  toggleRecurringAction,
} from "@/actions/recurring";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney, toNumber } from "@/lib/money";

type RecurringItem = {
  id: string;
  title: string;
  amount: string;
  type: "income" | "expense";
  frequency: "weekly" | "monthly" | "yearly";
  nextDueDate: string;
  active: boolean;
  category: { name: string; color: string };
};

const frequencyLabel = {
  weekly: "Týždenne",
  monthly: "Mesačne",
  yearly: "Ročne",
} as const;

export function RecurringList({
  items,
  workspaceId,
  currency = "EUR",
}: {
  items: RecurringItem[];
  workspaceId: string;
  currency?: string;
}) {
  const [pending, startTransition] = useTransition();

  if (items.length === 0) return null;

  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-card">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-3 px-3 py-3">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: item.category.color }}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-medium">{item.title}</p>
              {!item.active ? <Badge variant="secondary">Pauza</Badge> : null}
            </div>
            <p className="text-xs text-muted-foreground">
              {item.category.name} · {frequencyLabel[item.frequency]} · ďalšia{" "}
              {item.nextDueDate}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <p className="text-sm font-semibold tabular-nums">
              {formatMoney(toNumber(item.amount), currency)}
            </p>
            <div className="flex gap-1">
              <Button
                size="xs"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  startTransition(() =>
                    toggleRecurringAction(item.id, workspaceId, !item.active),
                  )
                }
              >
                {item.active ? "Pauza" : "Obnoviť"}
              </Button>
              <Button
                size="xs"
                variant="ghost"
                disabled={pending}
                onClick={() =>
                  startTransition(() =>
                    deleteRecurringAction(item.id, workspaceId),
                  )
                }
              >
                Zmazať
              </Button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
