"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { loadUpcomingAgendaAction } from "@/actions/timeline";
import { UpcomingAgenda } from "@/components/dashboard/upcoming-agenda";
import type { UpcomingAgendaItem } from "@/lib/agenda-types";
import type { TransactionItemOptionGroup } from "@/lib/transaction-item-picker";

const PAGE_SIZE = 10;

export function PropertyAgenda({
  workspaceId,
  propertyId,
  currency,
  categories,
  itemPickerGroups,
  initialItems,
}: {
  workspaceId: string;
  propertyId: string;
  currency: string;
  categories: { id: string; name: string }[];
  itemPickerGroups: TransactionItemOptionGroup[];
  initialItems: UpcomingAgendaItem[];
}) {
  const [items, setItems] = useState(() =>
    Array.isArray(initialItems) ? initialItems : [],
  );
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setItems(Array.isArray(initialItems) ? initialItems : []);
  }, [initialItems]);

  const reload = useCallback(() => {
    startTransition(async () => {
      try {
        const next = await loadUpcomingAgendaAction({
          workspaceId,
          propertyId,
        });
        setItems(next);
      } catch (err) {
        console.error("Property agenda load failed", err);
      }
    });
  }, [workspaceId, propertyId]);

  return (
    <UpcomingAgenda
      workspaceId={workspaceId}
      items={items}
      currency={currency}
      categories={categories}
      itemPickerGroups={itemPickerGroups}
      pageSize={PAGE_SIZE}
      loading={pending}
      title="Platby a termíny"
      emptyTitle="Žiadne platby ani termíny"
      emptyDescription="Pridajte platbu alebo termín viazaný na túto nehnuteľnosť alebo jej služby."
      onChanged={reload}
    />
  );
}
