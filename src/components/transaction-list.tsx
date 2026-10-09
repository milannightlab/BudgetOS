"use client";

import { useTransition } from "react";
import Link from "next/link";
import {
  deleteTransactionAction,
  markTransactionActualAction,
} from "@/actions/transactions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney, toNumber } from "@/lib/money";
import { cn } from "@/lib/utils";

export type TransactionRow = {
  id: string;
  title: string;
  amount: string;
  type: "income" | "expense";
  status: "actual" | "planned";
  date: string;
  itemId?: string | null;
  category: { name: string; color: string };
};

export function TransactionList({
  items,
  workspaceId,
  currency = "EUR",
  showActions = true,
  showItemLink = true,
}: {
  items: TransactionRow[];
  workspaceId: string;
  currency?: string;
  showActions?: boolean;
  /** When false, hide “← k položke” (e.g. already on property detail). */
  showItemLink?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  if (items.length === 0) return null;

  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-card">
      {items.map((item) => {
        const amount = toNumber(item.amount);
        const signed =
          item.type === "income" ? amount : -amount;
        return (
          <li key={item.id} className="flex items-center gap-3 px-3 py-3">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: item.category.color }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium">{item.title}</p>
                {item.status === "planned" ? (
                  <Badge variant="secondary">Plán</Badge>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                {item.category.name} · {item.date}
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
            <div className="flex flex-col items-end gap-1">
              <p
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  signed >= 0 ? "text-emerald-600" : "text-foreground",
                )}
              >
                {signed >= 0 ? "+" : ""}
                {formatMoney(signed, currency)}
              </p>
              {showActions ? (
                <div className="flex gap-1">
                  {item.status === "planned" ? (
                    <Button
                      size="xs"
                      variant="outline"
                      disabled={pending}
                      onClick={() =>
                        startTransition(() =>
                          markTransactionActualAction(item.id, workspaceId),
                        )
                      }
                    >
                      Zaplatené
                    </Button>
                  ) : null}
                  <Button
                    size="xs"
                    variant="ghost"
                    disabled={pending}
                    onClick={() =>
                      startTransition(() =>
                        deleteTransactionAction(item.id, workspaceId),
                      )
                    }
                  >
                    Zmazať
                  </Button>
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
