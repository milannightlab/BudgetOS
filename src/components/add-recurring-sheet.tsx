"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { FormSheetContent } from "@/components/form-sheet-content";
import { RecurringForm } from "@/components/recurring-form";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type Category = { id: string; name: string };

export function AddRecurringSheet({
  workspaceId,
  categories,
}: {
  workspaceId: string;
  categories: Category[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" className="gap-1">
          <Plus className="size-4" />
          Opakovaná
        </Button>
      </SheetTrigger>
      <FormSheetContent>
        <SheetHeader>
          <SheetTitle>Nová opakovaná platba</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-6">
          <RecurringForm
            workspaceId={workspaceId}
            categories={categories}
            onSuccess={() => setOpen(false)}
          />
        </div>
      </FormSheetContent>
    </Sheet>
  );
}
