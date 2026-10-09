"use client";

import { useState, useTransition } from "react";
import { createCustomVendorAction } from "@/actions/vendors";
import { FormSheetContent } from "@/components/form-sheet-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { VendorListItem } from "@/lib/queries";

export function AddVendorSheet({
  workspaceId,
  categoryKey,
  trigger,
  onCreated,
}: {
  workspaceId: string;
  categoryKey?: string | null;
  trigger: React.ReactNode;
  onCreated: (vendor: VendorListItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <FormSheetContent>
        <SheetHeader>
          <SheetTitle>Pridať vlastného dodávateľa</SheetTitle>
        </SheetHeader>
        <form
          className="space-y-3 px-4 pb-6"
          action={(formData) => {
            startTransition(async () => {
              setError(null);
              try {
                const vendor = await createCustomVendorAction(formData);
                onCreated(vendor);
                setOpen(false);
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Uloženie dodávateľa zlyhalo",
                );
              }
            });
          }}
        >
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input
            type="hidden"
            name="categoryKey"
            value={categoryKey ?? ""}
          />

          <div className="space-y-1.5">
            <Label htmlFor="vendor-name">Názov</Label>
            <Input id="vendor-name" name="name" required maxLength={160} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vendor-website">Web</Label>
            <Input
              id="vendor-website"
              name="website"
              type="url"
              placeholder="https://"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vendor-email">E-mail</Label>
            <Input id="vendor-email" name="email" type="email" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vendor-phone">Telefón</Label>
            <Input id="vendor-phone" name="phone" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vendor-address">Adresa</Label>
            <Input id="vendor-address" name="address" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vendor-companyId">IČO</Label>
            <Input id="vendor-companyId" name="companyId" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vendor-logo">Logo</Label>
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
            {pending ? "Ukladám…" : "Uložiť dodávateľa"}
          </Button>
        </form>
      </FormSheetContent>
    </Sheet>
  );
}
