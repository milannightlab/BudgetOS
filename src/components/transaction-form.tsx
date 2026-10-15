"use client";

import { useMemo, useState, useTransition } from "react";
import {
  createTransactionAction,
  updateTransactionAction,
} from "@/actions/transactions";
import { TransactionItemSelect } from "@/components/transaction-item-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { todayStr } from "@/lib/dates";
import {
  findTransactionItemModuleId,
  findTransactionItemOptionLabel,
  TRANSACTION_ITEM_NONE,
  type TransactionItemOptionGroup,
} from "@/lib/transaction-item-picker";
import type { Frequency } from "@/lib/recurring";
import { cn } from "@/lib/utils";

type Category = { id: string; name: string };

export type TransactionFormValues = {
  id?: string;
  title?: string;
  amount?: string;
  type?: "expense" | "income";
  status?: "actual" | "planned";
  date?: string;
  note?: string | null;
  categoryId?: string;
  itemId?: string | null;
  recurringPaymentId?: string | null;
  frequency?: Frequency | null;
  endDate?: string | null;
};

export function TransactionForm({
  workspaceId,
  categories,
  moduleId: defaultModuleId,
  itemId: lockedItemId,
  itemPickerGroups = [],
  lockedItemLabel,
  defaultStatus = "actual",
  defaultDate,
  initial,
  onSuccess,
}: {
  workspaceId: string;
  categories: Category[];
  moduleId?: string | null;
  itemId?: string | null;
  itemPickerGroups?: TransactionItemOptionGroup[];
  /** When itemId is fixed (detail stránka). */
  lockedItemLabel?: string | null;
  defaultStatus?: "actual" | "planned";
  defaultDate?: string;
  /** When set, form updates an existing transaction. */
  initial?: TransactionFormValues;
  onSuccess?: () => void;
}) {
  const isEdit = Boolean(initial?.id);
  const isSeries = Boolean(initial?.recurringPaymentId);

  const [type, setType] = useState<"expense" | "income">(
    initial?.type ?? "expense",
  );
  const [status, setStatus] = useState<"actual" | "planned">(
    initial?.status ?? defaultStatus,
  );
  const [categoryId, setCategoryId] = useState(
    initial?.categoryId ?? categories[0]?.id ?? "",
  );
  const [selectedItemId, setSelectedItemId] = useState<string | null>(
    lockedItemId ?? initial?.itemId ?? null,
  );
  const [repeat, setRepeat] = useState(false);
  const [frequency, setFrequency] = useState<Frequency>(
    initial?.frequency ?? "monthly",
  );
  const [hasEndDate, setHasEndDate] = useState(Boolean(initial?.endDate));
  const [seriesScope, setSeriesScope] = useState<"single" | "future">(
    isSeries ? "future" : "single",
  );
  const [pending, startTransition] = useTransition();

  const itemSelectValue = selectedItemId ?? TRANSACTION_ITEM_NONE;

  const resolvedModuleId = useMemo(() => {
    if (lockedItemId) return defaultModuleId ?? null;
    if (selectedItemId) {
      return (
        findTransactionItemModuleId(itemPickerGroups, selectedItemId) ??
        defaultModuleId ??
        null
      );
    }
    return defaultModuleId ?? null;
  }, [
    defaultModuleId,
    itemPickerGroups,
    lockedItemId,
    selectedItemId,
  ]);

  const assignedLabel = useMemo(() => {
    if (lockedItemId) {
      return (
        lockedItemLabel ??
        findTransactionItemOptionLabel(itemPickerGroups, lockedItemId) ??
        "Priradená položka"
      );
    }
    return null;
  }, [itemPickerGroups, lockedItemId, lockedItemLabel]);

  const showRepeatFields = !isEdit && repeat;
  const showSeriesFields = isEdit && isSeries && seriesScope === "future";

  return (
    <form
      className="space-y-3"
      action={(formData) => {
        startTransition(async () => {
          formData.set("type", type);
          formData.set("status", status);
          formData.set("categoryId", categoryId);
          if (resolvedModuleId) formData.set("moduleId", resolvedModuleId);
          const itemToSave = lockedItemId ?? selectedItemId;
          if (itemToSave) formData.set("itemId", itemToSave);

          if (isEdit && initial?.id) {
            formData.set("id", initial.id);
            formData.set("seriesScope", isSeries ? seriesScope : "single");
            if (showSeriesFields) {
              formData.set("frequency", frequency);
              if (hasEndDate) {
                // endDate comes from the input name
              } else {
                formData.set("endDate", "");
              }
            }
            await updateTransactionAction(formData);
          } else {
            formData.set("repeat", repeat ? "true" : "false");
            if (repeat) {
              formData.set("frequency", frequency);
              if (!hasEndDate) formData.delete("endDate");
            }
            await createTransactionAction(formData);
          }
          onSuccess?.();
        });
      }}
    >
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label>Typ</Label>
          <Select
            value={type}
            onValueChange={(v) => setType(v as "expense" | "income")}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expense">Výdavok</SelectItem>
              <SelectItem value="income">Príjem</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Stav</Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as "actual" | "planned")}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="actual">Skutočný</SelectItem>
              <SelectItem value="planned">Plánovaný</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="title">Názov</Label>
        <Input
          id="title"
          name="title"
          required
          placeholder="Napr. Nákup potravín"
          defaultValue={initial?.title}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="amount">Suma</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            placeholder="0.00"
            defaultValue={initial?.amount}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="date">Dátum</Label>
          <Input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={initial?.date ?? defaultDate ?? todayStr()}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Kategória</Label>
        <Select value={categoryId} onValueChange={(v) => v && setCategoryId(v)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Vyber kategóriu" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Položka</Label>
        {lockedItemId ? (
          <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
            {assignedLabel}
          </p>
        ) : (
          <TransactionItemSelect
            groups={itemPickerGroups}
            value={itemSelectValue}
            onValueChange={setSelectedItemId}
          />
        )}
        <p className="text-xs text-muted-foreground">
          Viaže platbu na konkrétnu nehnuteľnosť, službu alebo inú položku v
          module.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="note">Poznámka</Label>
        <Textarea
          id="note"
          name="note"
          rows={2}
          placeholder="Voliteľné"
          defaultValue={initial?.note ?? undefined}
        />
      </div>

      {!isEdit ? (
        <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-3">
          <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium">
            <input
              type="checkbox"
              checked={repeat}
              onChange={(e) => setRepeat(e.target.checked)}
              className="size-4 rounded border-border accent-teal-700"
            />
            Opakovať platbu
          </label>
          {showRepeatFields ? (
            <div className="space-y-3 border-t border-border pt-3">
              <div className="space-y-1.5">
                <Label>Frekvencia</Label>
                <Select
                  value={frequency}
                  onValueChange={(v) => setFrequency(v as Frequency)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Týždenne</SelectItem>
                    <SelectItem value="monthly">Mesačne</SelectItem>
                    <SelectItem value="yearly">Ročne</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={hasEndDate}
                  onChange={(e) => setHasEndDate(e.target.checked)}
                  className="size-4 rounded border-border accent-teal-700"
                />
                Nastaviť dátum ukončenia
              </label>
              {hasEndDate ? (
                <div className="space-y-1.5">
                  <Label htmlFor="endDate">Ukončenie série</Label>
                  <Input
                    id="endDate"
                    name="endDate"
                    type="date"
                    required
                    defaultValue={initial?.endDate ?? undefined}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {isEdit && isSeries ? (
        <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Rozsah úpravy
          </p>
          <div className="grid gap-2">
            <label
              className={cn(
                "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 text-sm",
                seriesScope === "single"
                  ? "border-teal-700 bg-teal-700/5"
                  : "border-border",
              )}
            >
              <input
                type="radio"
                name="seriesScopeUi"
                checked={seriesScope === "single"}
                onChange={() => setSeriesScope("single")}
                className="mt-0.5 accent-teal-700"
              />
              <span>
                <span className="font-medium">Len táto platba</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Ostatné opakované platby ostanú bez zmeny.
                </span>
              </span>
            </label>
            <label
              className={cn(
                "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 text-sm",
                seriesScope === "future"
                  ? "border-teal-700 bg-teal-700/5"
                  : "border-border",
              )}
            >
              <input
                type="radio"
                name="seriesScopeUi"
                checked={seriesScope === "future"}
                onChange={() => setSeriesScope("future")}
                className="mt-0.5 accent-teal-700"
              />
              <span>
                <span className="font-medium">Táto a budúce</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Upraviť šablónu a všetky budúce plánované platby.
                </span>
              </span>
            </label>
          </div>
          {showSeriesFields ? (
            <div className="space-y-3 border-t border-border pt-3">
              <div className="space-y-1.5">
                <Label>Frekvencia</Label>
                <Select
                  value={frequency}
                  onValueChange={(v) => setFrequency(v as Frequency)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Týždenne</SelectItem>
                    <SelectItem value="monthly">Mesačne</SelectItem>
                    <SelectItem value="yearly">Ročne</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={hasEndDate}
                  onChange={(e) => setHasEndDate(e.target.checked)}
                  className="size-4 rounded border-border accent-teal-700"
                />
                Nastaviť dátum ukončenia
              </label>
              {hasEndDate ? (
                <div className="space-y-1.5">
                  <Label htmlFor="endDate">Ukončenie série</Label>
                  <Input
                    id="endDate"
                    name="endDate"
                    type="date"
                    required
                    defaultValue={initial?.endDate ?? undefined}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending || !categoryId}>
        {pending ? "Ukladám…" : isEdit ? "Uložiť zmeny" : "Uložiť"}
      </Button>
    </form>
  );
}
