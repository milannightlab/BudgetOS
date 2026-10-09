"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AddItemSheet } from "@/components/items/add-item-sheet";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { itemDetailPath } from "@/lib/property-paths";
import { getItemTypesForModule } from "@/modules/item-types";
import type { ModuleSlug } from "@/modules/registry";

type ItemRow = {
  id: string;
  name: string;
  type: string;
  status: "active" | "inactive" | "archived";
  description?: string | null;
  assignedMember?: { name: string } | null;
};

type MemberOption = { userId: string; name: string };

const STATUS_LABEL: Record<ItemRow["status"], string> = {
  active: "Aktívna",
  inactive: "Neaktívna",
  archived: "Archivovaná",
};

export function ItemsSection({
  workspaceId,
  moduleId,
  moduleSlug,
  members,
  items,
}: {
  workspaceId: string;
  moduleId: string;
  moduleSlug: ModuleSlug;
  members: MemberOption[];
  items: ItemRow[];
}) {
  const types = getItemTypesForModule(moduleSlug);
  const typeLabel = Object.fromEntries(types.map((t) => [t.type, t.label]));
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        (item.description?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [items, query, typeFilter, statusFilter]);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Položky</h2>
        <AddItemSheet
          workspaceId={workspaceId}
          moduleId={moduleId}
          moduleSlug={moduleSlug}
          members={members}
          label="Vytvoriť"
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Hľadať položku…"
        />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Typ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všetky typy</SelectItem>
            {types.map((t) => (
              <SelectItem key={t.type} value={t.type}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Stav" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všetky stavy</SelectItem>
            <SelectItem value="active">Aktívne</SelectItem>
            <SelectItem value="inactive">Neaktívne</SelectItem>
            <SelectItem value="archived">Archivované</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Žiadne položky"
          description="Vytvorte položku ako nehnuteľnosť, vozidlo alebo zmluvu a priraďte k nej platby a termíny."
        />
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {filtered.map((item) => (
            <li key={item.id}>
              <Link
                href={itemDetailPath(item)}
                className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {typeLabel[item.type] ?? item.type}
                    {item.assignedMember
                      ? ` · ${item.assignedMember.name}`
                      : ""}
                  </p>
                </div>
                <Badge variant="secondary">{STATUS_LABEL[item.status]}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
