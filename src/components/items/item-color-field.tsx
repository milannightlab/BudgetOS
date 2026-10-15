"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  DEFAULT_ITEM_COLOR,
  ITEM_COLOR_PRESETS,
  parseItemColor,
} from "@/lib/item-color";

export function ItemColorField({
  value,
  onChange,
  id = "item-color",
}: {
  value?: string | null;
  onChange: (color: string) => void;
  id?: string;
}) {
  const color = parseItemColor(value) ?? DEFAULT_ITEM_COLOR;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Farba</Label>
      <div className="flex flex-wrap items-center gap-2">
        {ITEM_COLOR_PRESETS.map((preset) => {
          const selected = color === preset;
          return (
            <button
              key={preset}
              type="button"
              aria-label={`Farba ${preset}`}
              aria-pressed={selected}
              onClick={() => onChange(preset)}
              className={cn(
                "size-7 rounded-full border-2 transition-transform",
                selected
                  ? "scale-110 border-foreground"
                  : "border-transparent hover:scale-105",
              )}
              style={{ backgroundColor: preset }}
            />
          );
        })}
        <input type="hidden" name="attr_color" value={color} />
        <input
          id={id}
          type="color"
          value={color}
          onChange={(event) => {
            const next = parseItemColor(event.target.value);
            if (next) onChange(next);
          }}
          className="size-7 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
          aria-label="Vlastná farba"
        />
      </div>
    </div>
  );
}
