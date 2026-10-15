"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createItemAction, updateItemAction } from "@/actions/items";
import { ItemColorField } from "@/components/items/item-color-field";
import { Button } from "@/components/ui/button";
import { DEFAULT_ITEM_COLOR, readItemColor } from "@/lib/item-color";
import { itemDetailPath } from "@/lib/property-paths";
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
import {
  getItemTypeDefinition,
  getItemTypesForModule,
  type ItemTypeDefinition,
} from "@/modules/item-types";
import type { ModuleSlug } from "@/modules/registry";

type MemberOption = { userId: string; name: string };

type ItemFormValues = {
  id?: string;
  type: string;
  name: string;
  description?: string | null;
  status: "active" | "inactive" | "archived";
  assignedMemberUserId?: string | null;
  attributes?: Record<string, unknown>;
};

function AttributeFields({
  typeDef,
  values,
  onChange,
}: {
  typeDef: ItemTypeDefinition;
  values: Record<string, unknown>;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="space-y-3">
      {typeDef.fields.map((field) => {
        const id = `attr_${field.key}`;
        const raw = values[field.key];
        const value = raw === null || raw === undefined ? "" : String(raw);

        if (field.input === "select" && field.options?.length) {
          return (
            <div key={field.key} className="space-y-1.5">
              <Label htmlFor={id}>{field.label}</Label>
              <Select
                value={value || undefined}
                onValueChange={(v) => onChange(field.key, v)}
              >
                <SelectTrigger id={id}>
                  <SelectValue placeholder="Vyberte…" />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        }

        return (
          <div key={field.key} className="space-y-1.5">
            <Label htmlFor={id}>{field.label}</Label>
            <Input
              id={id}
              type={
                field.input === "number"
                  ? "number"
                  : field.input === "date"
                    ? "date"
                    : "text"
              }
              step={field.input === "number" ? "any" : undefined}
              value={value}
              onChange={(e) => onChange(field.key, e.target.value)}
            />
          </div>
        );
      })}
    </div>
  );
}

export function ItemForm({
  workspaceId,
  moduleId,
  moduleSlug,
  members,
  initial,
  onSuccess,
}: {
  workspaceId: string;
  moduleId: string;
  moduleSlug: ModuleSlug;
  members: MemberOption[];
  initial?: ItemFormValues;
  onSuccess?: (itemId: string) => void;
}) {
  const router = useRouter();
  const types = useMemo(
    () => getItemTypesForModule(moduleSlug),
    [moduleSlug],
  );
  const [type, setType] = useState(initial?.type ?? types[0]?.type ?? "generic");
  const [status, setStatus] = useState<"active" | "inactive" | "archived">(
    initial?.status ?? "active",
  );
  const [assignedMemberUserId, setAssignedMemberUserId] = useState(
    initial?.assignedMemberUserId ?? "none",
  );
  const [attributes, setAttributes] = useState<Record<string, unknown>>(
    initial?.attributes ?? {},
  );
  const [color, setColor] = useState(
    readItemColor(initial?.attributes) ?? DEFAULT_ITEM_COLOR,
  );
  const [pending, startTransition] = useTransition();

  const typeDef: ItemTypeDefinition =
    getItemTypeDefinition(moduleSlug, type) ??
    types[0] ?? {
      type: "generic",
      label: "Všeobecná položka",
      fields: [],
    };

  function handleTypeChange(nextType: string) {
    const nextDef = getItemTypeDefinition(moduleSlug, nextType);
    const nextKeys = new Set(nextDef?.fields.map((f) => f.key) ?? []);
    const kept: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(attributes)) {
      if (nextKeys.has(key) || key === "color" || key === "imageUrl") {
        kept[key] = value;
      }
    }
    setAttributes(kept);
    setType(nextType);
  }

  return (
    <form
      className="space-y-5"
      action={(formData) => {
        startTransition(async () => {
          formData.set("type", type);
          formData.set("status", status);
          formData.set(
            "assignedMemberUserId",
            assignedMemberUserId === "none" ? "" : assignedMemberUserId,
          );
          for (const [key, value] of Object.entries(attributes)) {
            if (key === "color") continue;
            if (value === null || value === undefined) continue;
            formData.set(`attr_${key}`, String(value));
          }
          formData.set("attr_color", color);
          if (initial?.id) {
            formData.set("id", initial.id);
            await updateItemAction(formData);
            onSuccess?.(initial.id);
            router.refresh();
          } else {
            const result = await createItemAction(formData);
            onSuccess?.(result.id);
            router.push(itemDetailPath({ id: result.id, type }));
            router.refresh();
          }
        });
      }}
    >
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="moduleId" value={moduleId} />

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Základné</h3>
        <div className="space-y-1.5">
          <Label>Typ</Label>
          <Select value={type} onValueChange={handleTypeChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {types.map((t) => (
                <SelectItem key={t.type} value={t.type}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="name">Názov</Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={initial?.name ?? ""}
            placeholder="Napr. Byt Bratislava"
          />
        </div>
        <ItemColorField
          value={color}
          onChange={(next) => {
            setColor(next);
            setAttributes((prev) => ({ ...prev, color: next }));
          }}
        />
        <div className="space-y-1.5">
          <Label htmlFor="description">Popis</Label>
          <Textarea
            id="description"
            name="description"
            rows={2}
            defaultValue={initial?.description ?? ""}
            placeholder="Voliteľný popis"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label>Stav</Label>
            <Select
              value={status}
              onValueChange={(v) =>
                setStatus(v as "active" | "inactive" | "archived")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Aktívna</SelectItem>
                <SelectItem value="inactive">Neaktívna</SelectItem>
                <SelectItem value="archived">Archivovaná</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Člen</Label>
            <Select
              value={assignedMemberUserId || "none"}
              onValueChange={setAssignedMemberUserId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Bez priradenia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Bez priradenia</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.userId} value={m.userId}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {typeDef.fields.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Doplňujúce</h3>
          <AttributeFields
            key={type}
            typeDef={typeDef}
            values={attributes}
            onChange={(key, value) =>
              setAttributes((prev) => ({ ...prev, [key]: value }))
            }
          />
        </section>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending
          ? "Ukladám…"
          : initial?.id
            ? "Uložiť zmeny"
            : "Vytvoriť položku"}
      </Button>
    </form>
  );
}
