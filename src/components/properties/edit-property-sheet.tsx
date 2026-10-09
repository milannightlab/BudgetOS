"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { FormSheetContent } from "@/components/form-sheet-content";
import { PropertyForm } from "@/components/properties/property-form";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { blobProxyUrl } from "@/lib/blob";
import { parseHiddenServiceTypes } from "@/modules/property-services";

export function EditPropertySheet({
  workspaceId,
  moduleId,
  item,
}: {
  workspaceId: string;
  moduleId: string;
  item: {
    id: string;
    name: string;
    attributes?: Record<string, unknown> | null;
  };
}) {
  const [open, setOpen] = useState(false);
  const attrs = (item.attributes ?? {}) as Record<string, unknown>;

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
          <SheetTitle>Upraviť nehnuteľnosť</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-6">
          <PropertyForm
            workspaceId={workspaceId}
            moduleId={moduleId}
            initial={{
              id: item.id,
              name: item.name,
              propertyType:
                typeof attrs.propertyType === "string"
                  ? attrs.propertyType
                  : "house",
              address:
                typeof attrs.address === "string" ? attrs.address : undefined,
              relationshipType:
                typeof attrs.relationshipType === "string"
                  ? attrs.relationshipType
                  : undefined,
              imageUrl:
                blobProxyUrl(
                  typeof attrs.imageUrl === "string" ? attrs.imageUrl : null,
                ) ?? undefined,
              hiddenServiceTypes: parseHiddenServiceTypes(attrs),
            }}
            onSuccess={() => setOpen(false)}
          />
        </div>
      </FormSheetContent>
    </Sheet>
  );
}
