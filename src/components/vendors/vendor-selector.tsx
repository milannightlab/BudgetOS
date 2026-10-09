"use client";

import { useEffect, useState, useTransition } from "react";
import { Building2, Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { searchVendorsAction } from "@/actions/vendors";
import { AddVendorSheet } from "@/components/vendors/add-vendor-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { blobProxyUrl } from "@/lib/blob";
import type { VendorListItem } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { vendorCategoryForServiceType } from "@/modules/vendor-categories";

export function VendorSelector({
  workspaceId,
  serviceType,
  value,
  initialVendor,
  onChange,
  name = "vendorId",
}: {
  workspaceId: string;
  /** Property serviceType used to derive category filter. */
  serviceType?: string | null;
  value: string | null;
  initialVendor?: VendorListItem | null;
  onChange: (vendor: VendorListItem | null) => void;
  name?: string;
}) {
  const categoryKey = serviceType
    ? vendorCategoryForServiceType(serviceType)
    : null;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [vendors, setVendors] = useState<VendorListItem[]>(
    initialVendor ? [initialVendor] : [],
  );
  const [selected, setSelected] = useState<VendorListItem | null>(
    initialVendor ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (initialVendor && (!selected || selected.id !== initialVendor.id)) {
      setSelected(initialVendor);
    }
  }, [initialVendor, selected]);

  useEffect(() => {
    if (!open) return;
    const handle = window.setTimeout(() => {
      startTransition(async () => {
        setError(null);
        try {
          const rows = await searchVendorsAction({
            workspaceId,
            categoryKey,
            query,
          });
          setVendors(rows);
        } catch (e) {
          setError(
            e instanceof Error ? e.message : "Nepodarilo sa načítať dodávateľov",
          );
        }
      });
    }, 200);
    return () => window.clearTimeout(handle);
  }, [open, workspaceId, categoryKey, query]);

  function selectVendor(vendor: VendorListItem | null) {
    setSelected(vendor);
    onChange(vendor);
    setOpen(false);
    setQuery("");
  }

  const logoSrc = blobProxyUrl(selected?.logoUrl);

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={value ?? ""} />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-auto min-h-9 w-full justify-between px-3 py-2 font-normal"
          >
            {selected ? (
              <span className="flex min-w-0 items-center gap-2">
                {logoSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoSrc}
                    alt=""
                    className="size-6 shrink-0 rounded object-contain"
                  />
                ) : (
                  <Building2 className="size-4 shrink-0 text-muted-foreground" />
                )}
                <span className="truncate">{selected.displayName}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">Vyberte dodávateľa…</span>
            )}
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-2"
          align="start"
        >
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Hľadať dodávateľa…"
            className="mb-2"
            autoFocus
          />

          <div className="max-h-56 overflow-y-auto">
            {pending && vendors.length === 0 ? (
              <p className="px-2 py-3 text-sm text-muted-foreground">
                Načítavam…
              </p>
            ) : error ? (
              <p className="px-2 py-3 text-sm text-destructive">{error}</p>
            ) : vendors.length === 0 ? (
              <p className="px-2 py-3 text-sm text-muted-foreground">
                Žiadni dodávatelia. Pridajte vlastného.
              </p>
            ) : (
              <ul className="space-y-0.5">
                {vendors.map((vendor) => {
                  const src = blobProxyUrl(vendor.logoUrl);
                  const isActive = selected?.id === vendor.id;
                  return (
                    <li key={vendor.id}>
                      <button
                        type="button"
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted",
                          isActive && "bg-muted",
                        )}
                        onClick={() => selectVendor(vendor)}
                      >
                        {src ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={src}
                            alt=""
                            className="size-6 shrink-0 rounded object-contain"
                          />
                        ) : (
                          <Building2 className="size-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className="min-w-0 flex-1 truncate">
                          {vendor.displayName}
                        </span>
                        {vendor.scope === "custom" ? (
                          <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                            vlastný
                          </span>
                        ) : null}
                        {isActive ? (
                          <Check className="size-4 shrink-0 text-primary" />
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="mt-2 border-t border-border pt-2">
            <AddVendorSheet
              workspaceId={workspaceId}
              categoryKey={categoryKey}
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2"
                >
                  <Plus className="size-4" />
                  Pridať vlastného dodávateľa
                </Button>
              }
              onCreated={(vendor) => {
                setVendors((prev) => {
                  if (prev.some((v) => v.id === vendor.id)) return prev;
                  return [vendor, ...prev];
                });
                selectVendor(vendor);
              }}
            />
          </div>
        </PopoverContent>
      </Popover>

      {selected ? (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-0.5">
              {selected.website ? (
                <p className="truncate">
                  Web:{" "}
                  <a
                    href={selected.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-foreground hover:underline"
                  >
                    {selected.website.replace(/^https?:\/\//, "")}
                  </a>
                </p>
              ) : null}
              {selected.email ? <p>E-mail: {selected.email}</p> : null}
              {selected.phone ? <p>Telefón: {selected.phone}</p> : null}
              {selected.address ? <p>Adresa: {selected.address}</p> : null}
              {!selected.website &&
              !selected.email &&
              !selected.phone &&
              !selected.address ? (
                <p>Žiadne verejné kontaktné údaje</p>
              ) : null}
            </div>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Zrušiť výber dodávateľa"
              onClick={() => selectVendor(null)}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
