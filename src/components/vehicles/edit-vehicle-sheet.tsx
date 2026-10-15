"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { FormSheetContent } from "@/components/form-sheet-content";
import { VehicleForm } from "@/components/vehicles/vehicle-form";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { blobProxyUrl } from "@/lib/blob";
import { readItemColor } from "@/lib/item-color";

export function EditVehicleSheet({
  workspaceId,
  moduleId,
  item,
}: {
  workspaceId: string;
  moduleId: string;
  item: {
    id: string;
    name: string;
    attributes?: Record<string, unknown> | null;
  };
}) {
  const [open, setOpen] = useState(false);
  const attrs = (item.attributes ?? {}) as Record<string, unknown>;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1">
          <Pencil className="size-4" />
          Upraviť
        </Button>
      </SheetTrigger>
      <FormSheetContent>
        <SheetHeader>
          <SheetTitle>Upraviť vozidlo</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-6">
          {open ? (
            <VehicleForm
              key={item.id}
              workspaceId={workspaceId}
              moduleId={moduleId}
              initial={{
                id: item.id,
                name: item.name,
                vehicleCategory:
                  typeof attrs.vehicleCategory === "string"
                    ? attrs.vehicleCategory
                    : "car",
                brand:
                  typeof attrs.brand === "string" ? attrs.brand : undefined,
                model:
                  typeof attrs.model === "string" ? attrs.model : undefined,
                year:
                  typeof attrs.year === "number" ||
                  typeof attrs.year === "string"
                    ? String(attrs.year)
                    : undefined,
                licensePlate:
                  typeof attrs.licensePlate === "string"
                    ? attrs.licensePlate
                    : undefined,
                vin: typeof attrs.vin === "string" ? attrs.vin : undefined,
                imageUrl:
                  blobProxyUrl(
                    typeof attrs.imageUrl === "string" ? attrs.imageUrl : null,
                  ) ?? undefined,
                color: readItemColor(attrs) ?? undefined,
              }}
              onSuccess={() => setOpen(false)}
            />
          ) : null}
        </div>
      </FormSheetContent>
    </Sheet>
  );
}
