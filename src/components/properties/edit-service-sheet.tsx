"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { updatePropertyServiceAction } from "@/actions/properties";
import { FormSheetContent } from "@/components/form-sheet-content";
import { VendorSelector } from "@/components/vendors/vendor-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { VendorListItem } from "@/lib/queries";

export function EditServiceSheet({
  workspaceId,
  service,
}: {
  workspaceId: string;
  service: {
    id: string;
    name: string;
    vendorId?: string | null;
    attributes?: Record<string, unknown> | null;
    vendor?: VendorListItem | null;
  };
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const attrs = (service.attributes ?? {}) as Record<string, unknown>;
  const serviceType =
    typeof attrs.serviceType === "string" ? attrs.serviceType : "other";

  const initialVendor: VendorListItem | null = service.vendor
    ? {
        id: service.vendor.id,
        name: service.vendor.name,
        displayName: service.vendor.displayName,
        logoUrl: service.vendor.logoUrl,
        website: service.vendor.website,
        email: service.vendor.email,
        phone: service.vendor.phone,
        address: service.vendor.address,
        companyId: service.vendor.companyId,
        scope: service.vendor.scope,
      }
    : null;

  const [vendor, setVendor] = useState<VendorListItem | null>(initialVendor);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setVendor(initialVendor);
      }}
    >
      <SheetTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1">
          <Pencil className="size-4" />
          Upraviť
        </Button>
      </SheetTrigger>
      <FormSheetContent>
        <SheetHeader>
          <SheetTitle>Upraviť službu</SheetTitle>
        </SheetHeader>
        <form
          className="space-y-3 px-4 pb-6"
          action={(formData) => {
            startTransition(async () => {
              await updatePropertyServiceAction(formData);
              setOpen(false);
            });
          }}
        >
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="id" value={service.id} />
          <input type="hidden" name="serviceType" value={serviceType} />

          <div className="space-y-1.5">
            <Label htmlFor="name">Názov služby</Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={service.name}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Dodávateľ</Label>
            <VendorSelector
              workspaceId={workspaceId}
              serviceType={serviceType}
              value={vendor?.id ?? null}
              initialVendor={initialVendor}
              onChange={setVendor}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contractNumber">Číslo zmluvy</Label>
            <Input
              id="contractNumber"
              name="contractNumber"
              defaultValue={
                typeof attrs.contractNumber === "string"
                  ? attrs.contractNumber
                  : ""
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="customerNumber">Zákaznícke / odberné číslo</Label>
            <Input
              id="customerNumber"
              name="customerNumber"
              defaultValue={
                typeof attrs.customerNumber === "string"
                  ? attrs.customerNumber
                  : ""
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Poznámka</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={2}
              defaultValue={
                typeof attrs.notes === "string" ? attrs.notes : ""
              }
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Zmena dodávateľa nepresunie existujúce platby ani dokumenty — ostávajú
            viazané na túto službu.
          </p>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Ukladám…" : "Uložiť zmeny"}
          </Button>
        </form>
      </FormSheetContent>
    </Sheet>
  );
}
