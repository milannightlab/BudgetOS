"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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
import { getModulesSorted } from "@/modules/registry";

type ItemRow = {
  id: string;
  name: string;
  type: string;
  status: "active" | "inactive" | "archived";
  description?: string | null;
  module?: { slug: string } | null;
  assignedMember?: { name: string } | null;
  /** Present when listing from queries that include relation context */
  parentPropertyId?: string | null;
};

const STATUS_LABEL: Record<ItemRow["status"], string> = {
  active: "Aktívna",
  inactive: "Neaktívna",
  archived: "Archivovaná",
};

export function AllItemsSection({ items }: { items: ItemRow[] }) {
  const modules = getModulesSorted();
  const moduleLabel = Object.fromEntries(modules.map((m) => [m.slug, m.label]));
  const [query, setQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (moduleFilter !== "all" && item.module?.slug !== moduleFilter) {
        return false;
      }
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        (item.description?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [items, query, moduleFilter, statusFilter]);

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Hľadať položku…"
        />
        <Select value={moduleFilter} onValueChange={setModuleFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Modul" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všetky moduly</SelectItem>
            {modules.map((m) => (
              <SelectItem key={m.slug} value={m.slug}>
                {m.label}
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
          description="Položky vytvárate v jednotlivých moduloch — napríklad vozidlo, poistku alebo predplatné."
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
                    {item.module?.slug
                      ? (moduleLabel[item.module.slug] ?? item.module.slug)
                      : "Bez modulu"}
                    {" · "}
                    {item.type}
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
    </div>
  );
}
