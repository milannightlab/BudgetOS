"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  deleteTransactionAction,
  markTransactionActualAction,
} from "@/actions/transactions";
import { EditTransactionSheet } from "@/components/edit-transaction-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Frequency } from "@/lib/recurring";
import type { TransactionItemOptionGroup } from "@/lib/transaction-item-picker";
import { formatMoney, toNumber } from "@/lib/money";
import { cn } from "@/lib/utils";

export type TransactionRow = {
  id: string;
  title: string;
  amount: string;
  type: "income" | "expense";
  status: "actual" | "planned";
  date: string;
  note?: string | null;
  categoryId?: string;
  itemId?: string | null;
  recurringPaymentId?: string | null;
  recurringFrequency?: Frequency | null;
  recurringEndDate?: string | null;
  category: { name: string; color: string };
};

type Category = { id: string; name: string };

function resolveDeleteScope(isSeries: boolean) {
  if (!window.confirm("Naozaj chcete zmazať túto platbu?")) return null;
  if (!isSeries) return "single" as const;
  const future = window.confirm(
    "Zmazať aj všetky budúce plánované platby v tejto sérii?",
  );
  return future ? ("future" as const) : ("single" as const);
}

export function TransactionList({
  items,
  workspaceId,
  currency = "EUR",
  showActions = true,
  showItemLink = true,
  categories = [],
  itemPickerGroups = [],
}: {
  items: TransactionRow[];
  workspaceId: string;
  currency?: string;
  showActions?: boolean;
  /** When false, hide “← k položke” (e.g. already on property detail). */
  showItemLink?: boolean;
  categories?: Category[];
  itemPickerGroups?: TransactionItemOptionGroup[];
}) {
  const [pending, startTransition] = useTransition();
  const [editId, setEditId] = useState<string | null>(null);

  if (items.length === 0) return null;

  const editing = editId ? (items.find((i) => i.id === editId) ?? null) : null;
  const canEdit = categories.length > 0;

  return (
    <>
      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {items.map((item) => {
          const amount = toNumber(item.amount);
          const isIncome = item.type === "income";
          const isPlanned = item.status === "planned";
          const isSeries = Boolean(item.recurringPaymentId);

          return (
            <li key={item.id} className="flex items-center gap-3 px-3 py-3">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.category.color }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <Badge variant={isPlanned ? "secondary" : "outline"}>
                    {isPlanned ? "Plánovaná" : "Uhradená"}
                  </Badge>
                  {isSeries ? (
                    <Badge variant="outline">Opakovaná</Badge>
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
              <p
                className={cn(
                  "shrink-0 text-sm font-semibold tabular-nums",
                  isIncome ? "text-emerald-600" : "text-foreground",
                )}
              >
                {isIncome ? "+" : ""}
                {formatMoney(amount, currency)}
              </p>
              {showActions && canEdit ? (
                <Button
                  size="xs"
                  variant="outline"
                  disabled={pending}
                  className="shrink-0"
                  onClick={() => setEditId(item.id)}
                >
                  Upraviť
                </Button>
              ) : null}
              {showActions && isPlanned ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  className="shrink-0"
                  onClick={() =>
                    startTransition(() =>
                      markTransactionActualAction(item.id, workspaceId),
                    )
                  }
                >
                  Zaplatené
                </Button>
              ) : null}
              {showActions ? (
                <Button
                  size="xs"
                  variant="ghost"
                  disabled={pending}
                  className="shrink-0"
                  onClick={() => {
                    const scope = resolveDeleteScope(isSeries);
                    if (!scope) return;
                    startTransition(() =>
                      deleteTransactionAction(item.id, workspaceId, scope),
                    );
                  }}
                >
                  Zmazať
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>

      {canEdit ? (
        <EditTransactionSheet
          open={editing != null}
          onOpenChange={(open) => {
            if (!open) setEditId(null);
          }}
          workspaceId={workspaceId}
          categories={categories}
          itemPickerGroups={itemPickerGroups}
          transaction={
            editing
              ? {
                  id: editing.id,
                  title: editing.title,
                  amount: editing.amount,
                  type: editing.type,
                  status: editing.status,
                  date: editing.date,
                  note: editing.note,
                  categoryId: editing.categoryId,
                  itemId: editing.itemId,
                  recurringPaymentId: editing.recurringPaymentId,
                  frequency: editing.recurringFrequency,
                  endDate: editing.recurringEndDate,
                }
              : null
          }
        />
      ) : null}
    </>
  );
}
