"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TRANSACTION_ITEM_NONE,
  type TransactionItemOptionGroup,
} from "@/lib/transaction-item-picker";
import { cn } from "@/lib/utils";

function selectedItemLabel(
  groups: TransactionItemOptionGroup[],
  value: string,
) {
  if (!value || value === TRANSACTION_ITEM_NONE) return null;
  for (const group of groups) {
    const opt = group.options.find((o) => o.id === value);
    if (!opt) continue;
    if (opt.depth > 0 && opt.parentId) {
      const parent = group.options.find((o) => o.id === opt.parentId);
      if (parent) return `${parent.label} › ${opt.label}`;
    }
    return opt.label;
  }
  return null;
}

export function TransactionItemSelect({
  groups,
  value,
  onValueChange,
  disabled,
}: {
  groups: TransactionItemOptionGroup[];
  value: string;
  onValueChange: (itemId: string | null) => void;
  disabled?: boolean;
}) {
  const hasOptions = groups.some((g) => g.options.length > 0);
  const selectedLabel = selectedItemLabel(groups, value);

  return (
    <Select
      value={value}
      onValueChange={(v) => {
        if (!v || v === TRANSACTION_ITEM_NONE) onValueChange(null);
        else onValueChange(v);
      }}
      disabled={disabled || !hasOptions}
    >
      <SelectTrigger className="w-full">
        <SelectValue
          placeholder={
            hasOptions ? "Vyberte položku (voliteľné)" : "Žiadne položky"
          }
        >
          {selectedLabel}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-72">
        <SelectItem value={TRANSACTION_ITEM_NONE}>Bez položky</SelectItem>
        {groups.map((group) =>
          group.options.length === 0 ? null : (
            <SelectGroup key={group.id}>
              <SelectLabel>{group.label}</SelectLabel>
              {group.options.map((opt) => (
                <SelectItem
                  key={opt.id}
                  value={opt.id}
                  textValue={
                    opt.depth > 0 && opt.parentId
                      ? `${group.options.find((o) => o.id === opt.parentId)?.label ?? ""} ${opt.label}`
                      : opt.label
                  }
                  className={cn(opt.depth > 0 && "pl-8")}
                >
                  <span
                    className={cn(
                      opt.depth === 0
                        ? "font-medium text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {opt.label}
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          ),
        )}
      </SelectContent>
    </Select>
  );
}
