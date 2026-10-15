"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { FormSheetContent } from "@/components/form-sheet-content";
import { TransactionForm } from "@/components/transaction-form";
import type { TransactionItemOptionGroup } from "@/lib/transaction-item-picker";
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
  itemPickerGroups,
  lockedItemLabel,
  label = "Pridať",
  variant = "default",
  defaultDate,
  defaultStatus,
  open: openProp,
  onOpenChange,
  showTrigger = true,
  onSuccess,
}: {
  workspaceId: string;
  categories: Category[];
  moduleId?: string | null;
  itemId?: string | null;
  itemPickerGroups?: TransactionItemOptionGroup[];
  lockedItemLabel?: string | null;
  label?: string;
  variant?: "default" | "outline";
  defaultDate?: string;
  defaultStatus?: "actual" | "planned";
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
          <Button size="sm" variant={variant} className="gap-1">
            <Plus className="size-4" />
            {label}
          </Button>
        </SheetTrigger>
      ) : null}
      <FormSheetContent>
        <SheetHeader>
          <SheetTitle>Nová platba</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-6">
          <TransactionForm
            key={defaultDate ?? "default"}
            workspaceId={workspaceId}
            categories={categories}
            moduleId={moduleId}
            itemId={itemId}
            itemPickerGroups={itemPickerGroups}
            lockedItemLabel={lockedItemLabel}
            defaultDate={defaultDate}
            defaultStatus={defaultStatus}
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
