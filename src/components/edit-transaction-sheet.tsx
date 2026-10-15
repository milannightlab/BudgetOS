"use client";

import { FormSheetContent } from "@/components/form-sheet-content";
import {
  TransactionForm,
  type TransactionFormValues,
} from "@/components/transaction-form";
import type { TransactionItemOptionGroup } from "@/lib/transaction-item-picker";
import {
  Sheet,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type Category = { id: string; name: string };

export function EditTransactionSheet({
  open,
  onOpenChange,
  workspaceId,
  categories,
  itemPickerGroups = [],
  transaction,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  categories: Category[];
  itemPickerGroups?: TransactionItemOptionGroup[];
  transaction: TransactionFormValues | null;
  onSuccess?: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <FormSheetContent>
        <SheetHeader>
          <SheetTitle>
            {transaction?.recurringPaymentId
              ? "Upraviť opakovanú platbu"
              : "Upraviť platbu"}
          </SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-6">
          {transaction?.id ? (
            <TransactionForm
              key={`${transaction.id}-${transaction.recurringPaymentId ?? "one"}`}
              workspaceId={workspaceId}
              categories={categories}
              itemPickerGroups={itemPickerGroups}
              initial={transaction}
              onSuccess={() => {
                onOpenChange(false);
                onSuccess?.();
              }}
            />
          ) : null}
        </div>
      </FormSheetContent>
    </Sheet>
  );
}
