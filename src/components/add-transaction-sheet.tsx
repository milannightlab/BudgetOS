"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { FormSheetContent } from "@/components/form-sheet-content";
import { TransactionForm } from "@/components/transaction-form";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type Category = { id: string; name: string };

export function AddTransactionSheet({
  workspaceId,
  categories,
  moduleId,
  itemId,
  label = "Pridať",
  variant = "default",
}: {
  workspaceId: string;
  categories: Category[];
  moduleId?: string | null;
  itemId?: string | null;
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
          <SheetTitle>Nová platba</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-6">
          <TransactionForm
            workspaceId={workspaceId}
            categories={categories}
            moduleId={moduleId}
            itemId={itemId}
            onSuccess={() => setOpen(false)}
          />
        </div>
      </FormSheetContent>
    </Sheet>
  );
}
