"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { EventForm } from "@/components/events/event-form";
import { FormSheetContent } from "@/components/form-sheet-content";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function AddEventSheet({
  workspaceId,
  moduleId,
  itemId,
}: {
  workspaceId: string;
  moduleId?: string | null;
  itemId?: string | null;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1">
          <Plus className="size-4" />
          Termín
        </Button>
      </SheetTrigger>
      <FormSheetContent>
        <SheetHeader>
          <SheetTitle>Nový termín</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-6">
          <EventForm
            workspaceId={workspaceId}
            moduleId={moduleId}
            itemId={itemId}
            onSuccess={() => setOpen(false)}
          />
        </div>
      </FormSheetContent>
    </Sheet>
  );
}
