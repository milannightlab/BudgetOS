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
  defaultDate,
  open: openProp,
  onOpenChange,
  showTrigger = true,
  onSuccess,
}: {
  workspaceId: string;
  moduleId?: string | null;
  itemId?: string | null;
  defaultDate?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
  onSuccess?: () => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : uncontrolledOpen;

  function setOpen(next: boolean) {
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {showTrigger ? (
        <SheetTrigger asChild>
          <Button size="sm" variant="outline" className="gap-1">
            <Plus className="size-4" />
            Termín
          </Button>
        </SheetTrigger>
      ) : null}
      <FormSheetContent>
        <SheetHeader>
          <SheetTitle>Nový termín</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-6">
          <EventForm
            key={defaultDate ?? "default"}
            workspaceId={workspaceId}
            moduleId={moduleId}
            itemId={itemId}
            defaultDate={defaultDate}
            onSuccess={() => {
              setOpen(false);
              onSuccess?.();
            }}
          />
        </div>
      </FormSheetContent>
    </Sheet>
  );
}
