"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, X } from "lucide-react";
import { saveVehicleAction } from "@/actions/vehicles";
import { ItemColorField } from "@/components/items/item-color-field";
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
import { DEFAULT_ITEM_COLOR } from "@/lib/item-color";
import { vehiclePath } from "@/lib/vehicle-paths";
import { VEHICLE_CATEGORIES } from "@/modules/vehicle-meta";

type Initial = {
  id: string;
  name: string;
  vehicleCategory?: string;
  brand?: string;
  model?: string;
  year?: string;
  licensePlate?: string;
  vin?: string;
  imageUrl?: string;
  color?: string;
};

export function VehicleForm({
  workspaceId,
  moduleId,
  initial,
  onSuccess,
}: {
  workspaceId: string;
  moduleId: string;
  initial?: Initial;
  onSuccess?: (id: string) => void;
}) {
  const router = useRouter();
  const [vehicleCategory, setVehicleCategory] = useState(
    initial?.vehicleCategory ?? "car",
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    initial?.imageUrl ?? null,
  );
  const [removeImage, setRemoveImage] = useState(false);
  const [color, setColor] = useState(initial?.color ?? DEFAULT_ITEM_COLOR);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-4"
      action={(formData) => {
        startTransition(async () => {
          setError(null);
          try {
            formData.set("attr_vehicleCategory", vehicleCategory);
            formData.set("attr_color", color);
            if (initial?.id) formData.set("id", initial.id);
            if (removeImage) formData.set("removeImage", "1");

            const result = await saveVehicleAction(formData);
            onSuccess?.(result.id);
            if (!initial?.id) {
              router.push(vehiclePath(result.id));
            }
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Uloženie zlyhalo");
          }
        });
      }}
    >
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="moduleId" value={moduleId} />

      <div className="space-y-1.5">
        <Label htmlFor="image">Fotografia</Label>
        {previewUrl ? (
          <div className="relative overflow-hidden rounded-xl border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Náhľad vozidla"
              className="h-40 w-full object-cover"
            />
            <Button
              type="button"
              size="icon-sm"
              variant="secondary"
              className="absolute top-2 right-2"
              onClick={() => {
                setRemoveImage(true);
                setPreviewUrl(null);
              }}
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center">
            <ImagePlus className="size-6 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              JPG, PNG, WebP alebo GIF · max. 5 MB
            </span>
          </div>
        )}
        <Input
          id="image"
          type="file"
          name="image"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setRemoveImage(false);
            setPreviewUrl(URL.createObjectURL(file));
          }}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="name">Názov</Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={initial?.name ?? ""}
          placeholder="Napr. Rodinné auto"
        />
      </div>

      <ItemColorField value={color} onChange={setColor} />

      <div className="space-y-1.5">
        <Label>Kategória</Label>
        <Select value={vehicleCategory} onValueChange={setVehicleCategory}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VEHICLE_CATEGORIES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="attr_brand">Značka</Label>
          <Input
            id="attr_brand"
            name="attr_brand"
            defaultValue={initial?.brand ?? ""}
            placeholder="Napr. Škoda"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="attr_model">Model</Label>
          <Input
            id="attr_model"
            name="attr_model"
            defaultValue={initial?.model ?? ""}
            placeholder="Napr. Octavia"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="attr_year">Rok</Label>
          <Input
            id="attr_year"
            name="attr_year"
            type="number"
            inputMode="numeric"
            defaultValue={initial?.year ?? ""}
            placeholder="Napr. 2019"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="attr_licensePlate">EČV</Label>
          <Input
            id="attr_licensePlate"
            name="attr_licensePlate"
            defaultValue={initial?.licensePlate ?? ""}
            placeholder="Napr. BA123AB"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="attr_vin">VIN</Label>
        <Input
          id="attr_vin"
          name="attr_vin"
          defaultValue={initial?.vin ?? ""}
          placeholder="Voliteľné VIN"
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending
          ? "Ukladám…"
          : initial?.id
            ? "Uložiť zmeny"
            : "Pridať vozidlo"}
      </Button>
    </form>
  );
}
