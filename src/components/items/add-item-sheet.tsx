"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { FormSheetContent } from "@/components/form-sheet-content";
import { ItemForm } from "@/components/items/item-form";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { ModuleSlug } from "@/modules/registry";

type MemberOption = { userId: string; name: string };

export function AddItemSheet({
  workspaceId,
  moduleId,
  moduleSlug,
  members,
  label = "Vytvoriť",
  variant = "default",
}: {
  workspaceId: string;
  moduleId: string;
  moduleSlug: ModuleSlug;
  members: MemberOption[];
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
          <SheetTitle>Nová položka</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-6">
          <ItemForm
            workspaceId={workspaceId}
            moduleId={moduleId}
            moduleSlug={moduleSlug}
            members={members}
            onSuccess={() => setOpen(false)}
          />
        </div>
      </FormSheetContent>
    </Sheet>
  );
}
