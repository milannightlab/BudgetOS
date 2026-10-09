"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, X } from "lucide-react";
import { savePropertyAction } from "@/actions/properties";
import { Button } from "@/components/ui/button";
import { propertyPath } from "@/lib/property-paths";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PROPERTY_TYPES = [
  { value: "house", label: "Rodinný dom" },
  { value: "apartment", label: "Byt" },
  { value: "cottage", label: "Chata / rekreačná nehnuteľnosť" },
  { value: "land", label: "Pozemok" },
  { value: "other", label: "Iné" },
] as const;

const RELATIONSHIPS = [
  { value: "own", label: "Vlastním" },
  { value: "rent", label: "Prenajímam" },
  { value: "manage", label: "Spravujem" },
] as const;

type Initial = {
  id: string;
  name: string;
  propertyType?: string;
  address?: string;
  relationshipType?: string;
  imageUrl?: string;
  hiddenServiceTypes?: string[];
};

export function PropertyForm({
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
  const [propertyType, setPropertyType] = useState(
    initial?.propertyType ?? "house",
  );
  const [relationshipType, setRelationshipType] = useState(
    initial?.relationshipType ?? "none",
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    initial?.imageUrl ?? null,
  );
  const [removeImage, setRemoveImage] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-4"
      action={(formData) => {
        startTransition(async () => {
          setError(null);
          try {
            formData.set("attr_propertyType", propertyType);
            if (relationshipType !== "none") {
              formData.set("attr_relationshipType", relationshipType);
            }
            if (initial?.id) formData.set("id", initial.id);
            if (removeImage) formData.set("removeImage", "1");

            const result = await savePropertyAction(formData);
            onSuccess?.(result.id);
            if (!initial?.id) {
              router.push(propertyPath(result.id));
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
              alt="Náhľad nehnuteľnosti"
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
          placeholder="Napr. Náš dom"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Typ nehnuteľnosti</Label>
        <Select value={propertyType} onValueChange={setPropertyType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROPERTY_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="attr_address">Adresa</Label>
        <Input
          id="attr_address"
          name="attr_address"
          defaultValue={initial?.address ?? ""}
          placeholder="Voliteľná adresa"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Vzťah k nehnuteľnosti</Label>
        <Select value={relationshipType} onValueChange={setRelationshipType}>
          <SelectTrigger>
            <SelectValue placeholder="Vyberte…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Neuvedené</SelectItem>
            {RELATIONSHIPS.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending
          ? "Ukladám…"
          : initial?.id
            ? "Uložiť zmeny"
            : "Pridať nehnuteľnosť"}
      </Button>
    </form>
  );
}
