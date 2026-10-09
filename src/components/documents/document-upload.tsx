"use client";

import { useState, useTransition } from "react";
import { uploadDocumentAction } from "@/actions/documents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type EventOption = { id: string; title: string };

export function DocumentUpload({
  workspaceId,
  moduleId,
  itemId,
  events = [],
  onSuccess,
}: {
  workspaceId: string;
  moduleId?: string | null;
  itemId?: string | null;
  events?: EventOption[];
  onSuccess?: () => void;
}) {
  const [linkEventId, setLinkEventId] = useState<string>("none");
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-3"
      action={(formData) => {
        startTransition(async () => {
          try {
            if (moduleId) formData.set("moduleId", moduleId);
            if (itemId) formData.set("itemId", itemId);
            if (linkEventId !== "none") {
              formData.set("linkEventId", linkEventId);
            }
            if (!formData.get("title")) {
              const file = formData.get("file");
              if (file instanceof File) {
                formData.set("title", file.name);
              }
            }
            await uploadDocumentAction(formData);
            toast.success("Dokument nahraný");
            onSuccess?.();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Upload zlyhal");
          }
        });
      }}
    >
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <div className="space-y-1.5">
        <Label htmlFor="title">Názov</Label>
        <Input id="title" name="title" placeholder="Voliteľné — default je názov súboru" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="file">Súbor</Label>
        <Input id="file" name="file" type="file" required />
      </div>
      {events.length > 0 ? (
        <div className="space-y-1.5">
          <Label>Prepojiť s termínom</Label>
          <Select value={linkEventId} onValueChange={(v) => v && setLinkEventId(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Bez prepojenia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Bez prepojenia</SelectItem>
              {events.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Nahrávam…" : "Nahrať dokument"}
      </Button>
    </form>
  );
}
