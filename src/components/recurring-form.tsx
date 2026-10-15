"use client";

import { useState, useTransition } from "react";
import { createRecurringAction } from "@/actions/recurring";
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
import { todayStr } from "@/lib/dates";

type Category = { id: string; name: string };

export function RecurringForm({
  workspaceId,
  categories,
  onSuccess,
}: {
  workspaceId: string;
  categories: Category[];
  onSuccess?: () => void;
}) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [frequency, setFrequency] = useState<"weekly" | "monthly" | "yearly">(
    "monthly",
  );
  const [type, setType] = useState<"expense" | "income">("expense");
  const [hasEndDate, setHasEndDate] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-3"
      action={(formData) => {
        startTransition(async () => {
          formData.set("categoryId", categoryId);
          formData.set("frequency", frequency);
          formData.set("type", type);
          if (!hasEndDate) formData.delete("endDate");
          await createRecurringAction(formData);
          onSuccess?.();
        });
      }}
    >
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <div className="space-y-1.5">
        <Label htmlFor="title">Názov</Label>
        <Input id="title" name="title" required placeholder="Napr. Nájom" />
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
          />
        </div>
        <div className="space-y-1.5">
          <Label>Typ</Label>
          <Select value={type} onValueChange={(v) => setType(v as "expense" | "income")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expense">Výdavok</SelectItem>
              <SelectItem value="income">Príjem</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label>Frekvencia</Label>
          <Select
            value={frequency}
            onValueChange={(v) =>
              setFrequency(v as "weekly" | "monthly" | "yearly")
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Týždenne</SelectItem>
              <SelectItem value="monthly">Mesačne</SelectItem>
              <SelectItem value="yearly">Ročne</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="nextDueDate">Ďalšia splatnosť</Label>
          <Input
            id="nextDueDate"
            name="nextDueDate"
            type="date"
            required
            defaultValue={todayStr()}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Kategória</Label>
        <Select value={categoryId} onValueChange={(v) => v && setCategoryId(v)}>
          <SelectTrigger>
            <SelectValue />
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
      <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-3">
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
            <Input id="endDate" name="endDate" type="date" required />
          </div>
        ) : null}
      </div>
      <Button type="submit" className="w-full" disabled={pending || !categoryId}>
        {pending ? "Ukladám…" : "Vytvoriť opakovanú platbu"}
      </Button>
    </form>
  );
}
