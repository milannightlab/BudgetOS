"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Trash2 } from "lucide-react";
import { deleteVendorAction } from "@/actions/vendors";
import { VendorFormSheet } from "@/components/vendors/vendor-form-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { blobProxyUrl } from "@/lib/blob";
import type { VendorManageItem } from "@/lib/queries";
import {
  getVendorCategoryLabel,
  VENDOR_CATEGORIES,
} from "@/modules/vendor-categories";

export function VendorList({
  workspaceId,
  vendors,
}: {
  workspaceId: string;
  vendors: VendorManageItem[];
}) {
  const [query, setQuery] = useState("");
  const [scopeFilter, setScopeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vendors.filter((v) => {
      if (scopeFilter !== "all" && v.scope !== scopeFilter) return false;
      if (
        categoryFilter !== "all" &&
        !v.categoryKeys.includes(categoryFilter)
      ) {
        return false;
      }
      if (!q) return true;
      return (
        v.displayName.toLowerCase().includes(q) ||
        v.name.toLowerCase().includes(q) ||
        (v.website?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [vendors, query, scopeFilter, categoryFilter]);

  function handleDelete(vendor: VendorManageItem) {
    const label =
      vendor.scope === "global"
        ? "globálneho dodávateľa (viditeľného vo všetkých rodinách)"
        : "vlastného dodávateľa";
    if (
      !window.confirm(
        `Naozaj zmazať ${label} „${vendor.displayName}“? Väzby na služby sa odpoja.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      setPendingId(vendor.id);
      try {
        await deleteVendorAction(vendor.id, workspaceId);
        router.refresh();
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Hľadať dodávateľa…"
        />
        <Select value={scopeFilter} onValueChange={setScopeFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Rozsah" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všetky rozsahy</SelectItem>
            <SelectItem value="global">Globálni</SelectItem>
            <SelectItem value="custom">Vlastní</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Kategória" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všetky kategórie</SelectItem>
            {VENDOR_CATEGORIES.map((c) => (
              <SelectItem key={c.key} value={c.key}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Žiadni dodávatelia podľa filtra.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {filtered.map((vendor) => {
            const logo = blobProxyUrl(vendor.logoUrl);
            return (
              <li
                key={vendor.id}
                className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  {logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logo}
                      alt=""
                      className="size-10 shrink-0 rounded border border-border object-contain"
                    />
                  ) : (
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Building2 className="size-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium">
                        {vendor.displayName}
                      </p>
                      <Badge variant="secondary">
                        {vendor.scope === "global" ? "Globálny" : "Vlastný"}
                      </Badge>
                    </div>
                    {vendor.website ? (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {vendor.website.replace(/^https?:\/\//, "")}
                      </p>
                    ) : null}
                    {vendor.categoryKeys.length > 0 ? (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {vendor.categoryKeys.map((key) => (
                          <Badge key={key} variant="outline" className="text-[10px]">
                            {getVendorCategoryLabel(key)}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                  <VendorFormSheet
                    workspaceId={workspaceId}
                    vendor={vendor}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1 text-destructive hover:text-destructive"
                    disabled={pending && pendingId === vendor.id}
                    onClick={() => handleDelete(vendor)}
                  >
                    <Trash2 className="size-3.5" />
                    Zmazať
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
