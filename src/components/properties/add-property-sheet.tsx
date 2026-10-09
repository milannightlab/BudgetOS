"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { FormSheetContent } from "@/components/form-sheet-content";
import { PropertyForm } from "@/components/properties/property-form";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function AddPropertySheet({
  workspaceId,
  moduleId,
  label = "Pridať nehnuteľnosť",
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
          <SheetTitle>Pridať nehnuteľnosť</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-6">
          <PropertyForm
            workspaceId={workspaceId}
            moduleId={moduleId}
            onSuccess={() => setOpen(false)}
          />
        </div>
      </FormSheetContent>
    </Sheet>
  );
}
