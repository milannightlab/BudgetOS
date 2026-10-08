"use client";

import { useState, useTransition } from "react";
import { upsertBudgetAction } from "@/actions/budgets";
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

type Category = { id: string; name: string };

export function BudgetForm({
  workspaceId,
  categories,
  year,
  month,
}: {
  workspaceId: string;
  categories: Category[];
  year: number;
  month: number;
}) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-3 sm:grid-cols-[1fr_120px_auto] sm:items-end"
      action={(formData) => {
        startTransition(async () => {
          formData.set("categoryId", categoryId);
          await upsertBudgetAction(formData);
        });
      }}
    >
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="year" value={year} />
      <input type="hidden" name="month" value={month} />
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
      <div className="space-y-1.5">
        <Label htmlFor="amount">Limit</Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          step="0.01"
          min="0"
          required
          placeholder="0.00"
        />
      </div>
      <Button type="submit" disabled={pending || !categoryId}>
        {pending ? "…" : "Uložiť"}
      </Button>
    </form>
  );
}
