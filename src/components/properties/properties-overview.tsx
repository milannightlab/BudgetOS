"use client";

import { useMemo, useOptimistic, useTransition } from "react";
import Link from "next/link";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, House } from "lucide-react";
import { reorderPropertiesAction } from "@/actions/properties";
import { AddPropertySheet } from "@/components/properties/add-property-sheet";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { blobProxyUrl } from "@/lib/blob";
import { propertyPath } from "@/lib/property-paths";
import { cn } from "@/lib/utils";
import {
  PROPERTY_TYPE_LABELS,
  type PropertyType,
} from "@/modules/property-services";

export type PropertyCardSummary = {
  paymentCount: number;
  nextEventDate: string | null;
};

type PropertyRow = {
  id: string;
  name: string;
  attributes: Record<string, unknown> | null;
};

export function PropertiesOverview({
  workspaceId,
  moduleId,
  properties,
  summaries,
}: {
  workspaceId: string;
  moduleId: string;
  properties: PropertyRow[];
  summaries: Record<string, PropertyCardSummary>;
}) {
  const [pending, startTransition] = useTransition();
  const [ordered, setOptimisticOrder] = useOptimistic(
    properties,
    (_current, next: PropertyRow[]) => next,
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const ids = useMemo(() => ordered.map((p) => p.id), [ordered]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = ordered.findIndex((p) => p.id === active.id);
    const newIndex = ordered.findIndex((p) => p.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(ordered, oldIndex, newIndex);
    const nextIds = next.map((p) => p.id);

    startTransition(async () => {
      setOptimisticOrder(next);
      await reorderPropertiesAction(workspaceId, nextIds);
    });
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Nehnuteľnosti"
        description="Dom, byt alebo pozemok — platby, termíny a dokumenty na jednom mieste. Poradie zmeníte ťahaním za úchyt."
        action={
          <AddPropertySheet workspaceId={workspaceId} moduleId={moduleId} />
        }
      />

      {ordered.length === 0 ? (
        <EmptyState
          title="Vaše nehnuteľnosti"
          description="Pridajte svoj dom, byt alebo inú nehnuteľnosť a majte všetky platby, termíny a dokumenty na jednom mieste."
          action={
            <AddPropertySheet
              workspaceId={workspaceId}
              moduleId={moduleId}
              label="Pridať nehnuteľnosť"
            />
          }
        />
      ) : (
        <div className="overflow-x-clip">
          <DndContext
            id="properties-sortable"
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToParentElement]}
            autoScroll={{
              threshold: { x: 0, y: 0.2 },
              layoutShiftCompensation: false,
            }}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={ids} strategy={rectSortingStrategy}>
              <ul
                className={cn(
                  "grid gap-3 overflow-x-clip sm:grid-cols-2",
                  pending && "opacity-90",
                )}
              >
                {ordered.map((property) => (
                  <SortablePropertyCard
                    key={property.id}
                    property={property}
                    summary={summaries[property.id]}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}

function SortablePropertyCard({
  property,
  summary,
}: {
  property: PropertyRow;
  summary?: PropertyCardSummary;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: property.id });

  const attrs = (property.attributes ?? {}) as Record<string, unknown>;
  const typeKey =
    typeof attrs.propertyType === "string" ? attrs.propertyType : "other";
  const typeLabel = PROPERTY_TYPE_LABELS[typeKey as PropertyType] ?? typeKey;
  const address = typeof attrs.address === "string" ? attrs.address : null;
  const imageUrl = blobProxyUrl(
    typeof attrs.imageUrl === "string" ? attrs.imageUrl : null,
  );

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      className={cn(
        "min-w-0 max-w-full",
        isDragging && "z-10 opacity-90",
      )}
    >
      <div
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card",
          isDragging && "shadow-lg ring-2 ring-primary/30",
        )}
      >
        <button
          type="button"
          ref={setActivatorNodeRef}
          className="absolute right-2 top-2 z-10 flex size-8 items-center justify-center rounded-lg border border-border/80 bg-background/90 text-muted-foreground shadow-sm backdrop-blur hover:bg-muted hover:text-foreground touch-none"
          aria-label={`Presunúť ${property.name}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>

        <Link
          href={propertyPath(property.id)}
          prefetch={false}
          className="flex h-full flex-col transition-colors hover:bg-muted/40"
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={property.name}
              className="h-36 w-full object-cover"
            />
          ) : null}
          <div className="flex flex-col gap-3 p-4 pr-12">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-600/10">
                <House className="size-5 text-teal-700" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{property.name}</p>
                <Badge variant="secondary" className="mt-1">
                  {typeLabel}
                </Badge>
                {address ? (
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {address}
                  </p>
                ) : null}
              </div>
            </div>
            {summary &&
            (summary.paymentCount > 0 || summary.nextEventDate) ? (
              <p className="text-xs text-muted-foreground">
                {summary.paymentCount > 0
                  ? `${summary.paymentCount} platieb`
                  : null}
                {summary.paymentCount > 0 && summary.nextEventDate
                  ? " · "
                  : null}
                {summary.nextEventDate
                  ? `Ďalší termín ${summary.nextEventDate}`
                  : null}
              </p>
            ) : null}
          </div>
        </Link>
      </div>
    </li>
  );
}
