"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { RecurringForm } from "@/components/recurring-form";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
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
      <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto rounded-t-2xl">
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
      </SheetContent>
    </Sheet>
  );
}
