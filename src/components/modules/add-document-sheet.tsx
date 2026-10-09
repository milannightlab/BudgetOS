"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { DocumentUpload } from "@/components/documents/document-upload";
import { FormSheetContent } from "@/components/form-sheet-content";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function AddDocumentSheet({
  workspaceId,
  moduleId,
  itemId,
  events = [],
}: {
  workspaceId: string;
  moduleId?: string | null;
  itemId?: string | null;
  events?: { id: string; title: string }[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1">
          <Upload className="size-4" />
          Dokument
        </Button>
      </SheetTrigger>
      <FormSheetContent>
        <SheetHeader>
          <SheetTitle>Nahrať dokument</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-6">
          <DocumentUpload
            workspaceId={workspaceId}
            moduleId={moduleId}
            itemId={itemId}
            events={events}
            onSuccess={() => setOpen(false)}
          />
        </div>
      </FormSheetContent>
    </Sheet>
  );
}
