"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { saveVendorAction } from "@/actions/vendors";
import { FormSheetContent } from "@/components/form-sheet-content";
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
import {
  Sheet,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { blobProxyUrl } from "@/lib/blob";
import type { VendorManageItem } from "@/lib/queries";
import { VENDOR_CATEGORIES } from "@/modules/vendor-categories";
import { cn } from "@/lib/utils";

export function VendorFormSheet({
  workspaceId,
  vendor,
  defaultScope = "custom",
  trigger,
}: {
  workspaceId: string;
  vendor?: VendorManageItem | null;
  defaultScope?: "global" | "custom";
  trigger?: React.ReactNode;
}) {
  const isEdit = Boolean(vendor);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<"global" | "custom">(
    vendor?.scope ?? defaultScope,
  );
  const [categoryKeys, setCategoryKeys] = useState<string[]>(
    vendor?.categoryKeys ?? [],
  );
  const [removeLogo, setRemoveLogo] = useState(false);
  const router = useRouter();

  const logoPreview = useMemo(() => {
    if (removeLogo) return null;
    return blobProxyUrl(vendor?.logoUrl);
  }, [removeLogo, vendor?.logoUrl]);

  function toggleCategory(key: string) {
    setCategoryKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setScope(vendor?.scope ?? defaultScope);
          setCategoryKeys(vendor?.categoryKeys ?? []);
          setRemoveLogo(false);
          setError(null);
        }
      }}
    >
      <SheetTrigger asChild>
        {trigger ??
          (isEdit ? (
            <Button size="sm" variant="outline" className="gap-1">
              <Pencil className="size-3.5" />
              Upraviť
            </Button>
          ) : (
            <Button size="sm" className="gap-1">
              <Plus className="size-4" />
              Pridať dodávateľa
            </Button>
          ))}
      </SheetTrigger>
      <FormSheetContent>
        <SheetHeader>
          <SheetTitle>
            {isEdit ? "Upraviť dodávateľa" : "Pridať dodávateľa"}
          </SheetTitle>
        </SheetHeader>
        <form
          className="space-y-3 px-4 pb-6"
          action={(formData) => {
            startTransition(async () => {
              setError(null);
              formData.set("scope", scope);
              formData.set("removeLogo", removeLogo ? "1" : "0");
              for (const key of categoryKeys) {
                formData.append("categoryKeys", key);
              }
              try {
                await saveVendorAction(formData);
                setOpen(false);
                router.refresh();
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Uloženie dodávateľa zlyhalo",
                );
              }
            });
          }}
        >
          <input type="hidden" name="workspaceId" value={workspaceId} />
          {vendor ? <input type="hidden" name="id" value={vendor.id} /> : null}

          {!isEdit ? (
            <div className="space-y-1.5">
              <Label>Typ</Label>
              <Select
                value={scope}
                onValueChange={(v) => setScope(v as "global" | "custom")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Vlastný (táto rodina)</SelectItem>
                  <SelectItem value="global">Globálny (všetky rodiny)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Typ:{" "}
              {vendor?.scope === "global"
                ? "Globálny (všetky rodiny)"
                : "Vlastný (táto rodina)"}
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="vendor-name">Názov</Label>
            <Input
              id="vendor-name"
              name="name"
              required
              maxLength={160}
              defaultValue={vendor?.displayName ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vendor-website">Web</Label>
            <Input
              id="vendor-website"
              name="website"
              type="url"
              placeholder="https://"
              defaultValue={vendor?.website ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vendor-email">E-mail</Label>
            <Input
              id="vendor-email"
              name="email"
              type="email"
              defaultValue={vendor?.email ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vendor-phone">Telefón</Label>
            <Input
              id="vendor-phone"
              name="phone"
              defaultValue={vendor?.phone ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vendor-address">Adresa</Label>
            <Input
              id="vendor-address"
              name="address"
              defaultValue={vendor?.address ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vendor-companyId">IČO</Label>
            <Input
              id="vendor-companyId"
              name="companyId"
              defaultValue={vendor?.companyId ?? ""}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Kategórie služieb</Label>
            <div className="grid max-h-40 grid-cols-2 gap-1.5 overflow-y-auto rounded-lg border border-border p-2">
              {VENDOR_CATEGORIES.map((cat) => {
                const checked = categoryKeys.includes(cat.key);
                return (
                  <label
                    key={cat.key}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted",
                      checked && "bg-muted",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="size-3.5 accent-primary"
                      checked={checked}
                      onChange={() => toggleCategory(cat.key)}
                    />
                    <span className="truncate">{cat.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vendor-logo">Logo</Label>
            {logoPreview ? (
              <div className="mb-2 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoPreview}
                  alt=""
                  className="size-12 rounded border border-border object-contain"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setRemoveLogo(true)}
                >
                  Odstrániť logo
                </Button>
              </div>
            ) : null}
            <Input
              id="vendor-logo"
              name="logo"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
            />
          </div>

          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Ukladám…" : isEdit ? "Uložiť zmeny" : "Vytvoriť"}
          </Button>
        </form>
      </FormSheetContent>
    </Sheet>
  );
}
