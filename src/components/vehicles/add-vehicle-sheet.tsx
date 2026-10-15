"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { FormSheetContent } from "@/components/form-sheet-content";
import { VehicleForm } from "@/components/vehicles/vehicle-form";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function AddVehicleSheet({
  workspaceId,
  moduleId,
  label = "Pridať vozidlo",
  variant = "default",
}: {
  workspaceId: string;
  moduleId: string;
  label?: string;
  variant?: "default" | "outline";
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant={variant} className="gap-1">
          <Plus className="size-4" />
          {label}
        </Button>
      </SheetTrigger>
      <FormSheetContent>
        <SheetHeader>
          <SheetTitle>Pridať vozidlo</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-6">
          <VehicleForm
            workspaceId={workspaceId}
            moduleId={moduleId}
            onSuccess={() => setOpen(false)}
          />
        </div>
      </FormSheetContent>
    </Sheet>
  );
}
