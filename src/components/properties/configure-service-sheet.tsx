"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { configurePropertyServiceAction } from "@/actions/properties";
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

export function ConfigureServiceSheet({
  workspaceId,
  moduleId,
  propertyId,
  serviceType,
  defaultName,
  trigger,
}: {
  workspaceId: string;
  moduleId: string;
  propertyId: string;
  serviceType: string;
  defaultName: string;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [vendor, setVendor] = useState<VendorListItem | null>(null);
  const router = useRouter();

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setVendor(null);
      }}
    >
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <FormSheetContent>
        <SheetHeader>
          <SheetTitle>Nastaviť službu</SheetTitle>
        </SheetHeader>
        <form
          className="space-y-3 px-4 pb-6"
          action={(formData) => {
            startTransition(async () => {
              try {
                await configurePropertyServiceAction(formData);
                setOpen(false);
                setVendor(null);
                toast.success("Služba bola úspešne pridaná");
                router.refresh();
              } catch (e) {
                toast.error(
                  e instanceof Error ? e.message : "Nepodarilo sa pridať službu",
                );
              }
            });
          }}
        >
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="moduleId" value={moduleId} />
          <input type="hidden" name="propertyId" value={propertyId} />
          <input type="hidden" name="serviceType" value={serviceType} />

          <div className="space-y-1.5">
            <Label htmlFor="name">Názov služby</Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={defaultName}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Dodávateľ</Label>
            <VendorSelector
              workspaceId={workspaceId}
              serviceType={serviceType}
              value={vendor?.id ?? null}
              onChange={setVendor}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contractNumber">Číslo zmluvy</Label>
            <Input id="contractNumber" name="contractNumber" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="customerNumber">Zákaznícke / odberné číslo</Label>
            <Input id="customerNumber" name="customerNumber" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Poznámka</Label>
            <Textarea id="notes" name="notes" rows={2} />
          </div>
          <p className="text-xs text-muted-foreground">
            Pri výmene dodávateľa neskôr môžete archivovať túto službu a nastaviť
            novú — platby a dokumenty ostanú viazané na pôvodnú službu.
          </p>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Ukladám…" : "Uložiť službu"}
          </Button>
        </form>
      </FormSheetContent>
    </Sheet>
  );
}
