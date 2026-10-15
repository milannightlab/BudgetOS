"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
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

export function EditItemSheet({
  workspaceId,
  moduleId,
  moduleSlug,
  members,
  item,
}: {
  workspaceId: string;
  moduleId: string;
  moduleSlug: ModuleSlug;
  members: MemberOption[];
  item: {
    id: string;
    type: string;
    name: string;
    description?: string | null;
    status: "active" | "inactive" | "archived";
    assignedMemberUserId?: string | null;
    attributes?: Record<string, unknown> | null;
  };
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1">
          <Pencil className="size-4" />
          Upraviť
        </Button>
      </SheetTrigger>
      <FormSheetContent>
        <SheetHeader>
          <SheetTitle>Upraviť položku</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-6">
          {open ? (
            <ItemForm
              key={item.id}
              workspaceId={workspaceId}
              moduleId={moduleId}
              moduleSlug={moduleSlug}
              members={members}
              initial={{
                id: item.id,
                type: item.type,
                name: item.name,
                description: item.description,
                status: item.status,
                assignedMemberUserId: item.assignedMemberUserId,
                attributes: item.attributes ?? {},
              }}
              onSuccess={() => setOpen(false)}
            />
          ) : null}
        </div>
      </FormSheetContent>
    </Sheet>
  );
}
