"use client";

import { useTransition } from "react";
import { createEventAction } from "@/actions/events";
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
import { Textarea } from "@/components/ui/textarea";
import { todayStr } from "@/lib/dates";
import { useState } from "react";

export function EventForm({
  workspaceId,
  moduleId,
  itemId,
  onSuccess,
}: {
  workspaceId: string;
  moduleId?: string | null;
  itemId?: string | null;
  onSuccess?: () => void;
}) {
  const [type, setType] = useState<"deadline" | "event" | "reminder">("deadline");
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-3"
      action={(formData) => {
        startTransition(async () => {
          formData.set("type", type);
          if (moduleId) formData.set("moduleId", moduleId);
          if (itemId) formData.set("itemId", itemId);
          await createEventAction(formData);
          onSuccess?.();
        });
      }}
    >
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <div className="space-y-1.5">
        <Label htmlFor="title">Názov</Label>
        <Input id="title" name="title" required placeholder="Napr. STK auto" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="eventDate">Dátum</Label>
          <Input
            id="eventDate"
            name="eventDate"
            type="date"
            required
            defaultValue={todayStr()}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Typ</Label>
          <Select
            value={type}
            onValueChange={(v) =>
              setType(v as "deadline" | "event" | "reminder")
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="deadline">Termín</SelectItem>
              <SelectItem value="event">Udalosť</SelectItem>
              <SelectItem value="reminder">Pripomienka</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="note">Poznámka</Label>
        <Textarea id="note" name="note" rows={2} />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Ukladám…" : "Pridať termín"}
      </Button>
    </form>
  );
}
