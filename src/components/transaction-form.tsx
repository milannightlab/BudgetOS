"use client";

import { useState, useTransition } from "react";
import { createTransactionAction } from "@/actions/transactions";
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

type Category = { id: string; name: string };

export function TransactionForm({
  workspaceId,
  categories,
  moduleId,
  itemId,
  defaultStatus = "actual",
  onSuccess,
}: {
  workspaceId: string;
  categories: Category[];
  moduleId?: string | null;
  itemId?: string | null;
  defaultStatus?: "actual" | "planned";
  onSuccess?: () => void;
}) {
  const [type, setType] = useState<"expense" | "income">("expense");
  const [status, setStatus] = useState<"actual" | "planned">(defaultStatus);
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-3"
      action={(formData) => {
        startTransition(async () => {
          formData.set("type", type);
          formData.set("status", status);
          formData.set("categoryId", categoryId);
          if (moduleId) formData.set("moduleId", moduleId);
          if (itemId) formData.set("itemId", itemId);
          await createTransactionAction(formData);
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
            <SelectTrigger>
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
            <SelectTrigger>
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
        <Input id="title" name="title" required placeholder="Napr. Nákup potravín" />
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
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="date">Dátum</Label>
          <Input id="date" name="date" type="date" required defaultValue={todayStr()} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Kategória</Label>
        <Select value={categoryId} onValueChange={(v) => v && setCategoryId(v)}>
          <SelectTrigger>
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
        <Label htmlFor="note">Poznámka</Label>
        <Textarea id="note" name="note" rows={2} placeholder="Voliteľné" />
      </div>
      <Button type="submit" className="w-full" disabled={pending || !categoryId}>
        {pending ? "Ukladám…" : "Uložiť"}
      </Button>
    </form>
  );
}
