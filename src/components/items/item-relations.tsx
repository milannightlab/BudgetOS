"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  createItemRelationAction,
  deleteItemRelationAction,
} from "@/actions/item-relations";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { itemDetailPath } from "@/lib/property-paths";
import { RELATION_TYPES } from "@/modules/item-types";

type RelatedItem = {
  id: string;
  name: string;
  type?: string;
  parentPropertyId?: string | null;
};

type RelationRow = {
  id: string;
  relationType: string;
  sourceItemId: string;
  targetItemId: string;
  sourceItem: RelatedItem;
  targetItem: RelatedItem;
};

export function ItemRelationsPanel({
  workspaceId,
  itemId,
  relations,
  candidates,
}: {
  workspaceId: string;
  itemId: string;
  relations: RelationRow[];
  candidates: RelatedItem[];
}) {
  const [targetItemId, setTargetItemId] = useState("");
  const [relationType, setRelationType] = useState("related_to");
  const [pending, startTransition] = useTransition();

  const relationLabel = Object.fromEntries(
    RELATION_TYPES.map((r) => [r.value, r.label]),
  );

  return (
    <div className="space-y-3">
      {relations.length === 0 ? (
        <p className="text-sm text-muted-foreground">Žiadne súvisiace položky.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {relations.map((rel) => {
            const other =
              rel.sourceItemId === itemId ? rel.targetItem : rel.sourceItem;
            const label = relationLabel[rel.relationType] ?? rel.relationType;
            const parentPropertyId =
              other.parentPropertyId ??
              (rel.relationType === "belongs_to" &&
              rel.sourceItemId === other.id
                ? rel.targetItemId
                : null);
            return (
              <li
                key={rel.id}
                className="flex items-center gap-3 px-3 py-3 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={itemDetailPath({
                      id: other.id,
                      type: other.type ?? "unknown",
                      parentPropertyId,
                    })}
                    className="font-medium hover:underline"
                  >
                    {other.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => {
                    startTransition(async () => {
                      await deleteItemRelationAction(
                        rel.id,
                        workspaceId,
                        itemId,
                      );
                    });
                  }}
                >
                  Odstrániť
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {candidates.length > 0 ? (
        <form
          className="flex flex-col gap-2 sm:flex-row"
          action={(formData) => {
            startTransition(async () => {
              formData.set("targetItemId", targetItemId);
              formData.set("relationType", relationType);
              await createItemRelationAction(formData);
              setTargetItemId("");
            });
          }}
        >
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="sourceItemId" value={itemId} />
          <Select value={targetItemId} onValueChange={setTargetItemId}>
            <SelectTrigger className="sm:flex-1">
              <SelectValue placeholder="Vybrať položku…" />
            </SelectTrigger>
            <SelectContent>
              {candidates.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={relationType} onValueChange={setRelationType}>
            <SelectTrigger className="sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RELATION_TYPES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="submit"
            size="sm"
            disabled={pending || !targetItemId}
          >
            Pridať väzbu
          </Button>
        </form>
      ) : null}
    </div>
  );
}
