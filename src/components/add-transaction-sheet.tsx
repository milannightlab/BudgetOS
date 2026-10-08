"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { TransactionForm } from "@/components/transaction-form";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type Category = { id: string; name: string };

export function AddTransactionSheet({
  workspaceId,
  categories,
  label = "Pridať",
}: {
  workspaceId: string;
  categories: Category[];
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" className="gap-1">
          <Plus className="size-4" />
          {label}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Nová transakcia</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-6">
          <TransactionForm
            workspaceId={workspaceId}
            categories={categories}
            onSuccess={() => setOpen(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
