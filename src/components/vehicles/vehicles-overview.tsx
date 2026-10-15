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
import { CarFront, GripVertical } from "lucide-react";
import { reorderVehiclesAction } from "@/actions/vehicles";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { AddVehicleSheet } from "@/components/vehicles/add-vehicle-sheet";
import { blobProxyUrl } from "@/lib/blob";
import { vehiclePath } from "@/lib/vehicle-paths";
import { cn } from "@/lib/utils";
import {
  VEHICLE_CATEGORY_LABELS,
  type VehicleCategory,
} from "@/modules/vehicle-meta";

export type VehicleCardSummary = {
  paymentCount: number;
  nextEventDate: string | null;
};

type VehicleRow = {
  id: string;
  name: string;
  attributes: Record<string, unknown> | null;
};

export function VehiclesOverview({
  workspaceId,
  moduleId,
  vehicles,
  summaries,
}: {
  workspaceId: string;
  moduleId: string;
  vehicles: VehicleRow[];
  summaries: Record<string, VehicleCardSummary>;
}) {
  const [pending, startTransition] = useTransition();
  const [ordered, setOptimisticOrder] = useOptimistic(
    vehicles,
    (_current, next: VehicleRow[]) => next,
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const ids = useMemo(() => ordered.map((v) => v.id), [ordered]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = ordered.findIndex((v) => v.id === active.id);
    const newIndex = ordered.findIndex((v) => v.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(ordered, oldIndex, newIndex);

    startTransition(async () => {
      setOptimisticOrder(next);
      await reorderVehiclesAction(
        workspaceId,
        next.map((v) => v.id),
      );
    });
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Vozidlá"
        description="Autá, bicykle, údržba, STK a parkovanie. Poradie zmeníte ťahaním za úchyt."
        action={
          <AddVehicleSheet workspaceId={workspaceId} moduleId={moduleId} />
        }
      />

      {ordered.length === 0 ? (
        <EmptyState
          title="Vaše vozidlá"
          description="Pridajte auto, bicykel alebo iné vozidlo a majte platby, termíny a dokumenty na jednom mieste."
          action={
            <AddVehicleSheet
              workspaceId={workspaceId}
              moduleId={moduleId}
              label="Pridať vozidlo"
            />
          }
        />
      ) : (
        <div className="overflow-x-clip">
          <DndContext
            id="vehicles-sortable"
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
                {ordered.map((vehicle) => (
                  <SortableVehicleCard
                    key={vehicle.id}
                    vehicle={vehicle}
                    summary={summaries[vehicle.id]}
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

function SortableVehicleCard({
  vehicle,
  summary,
}: {
  vehicle: VehicleRow;
  summary?: VehicleCardSummary;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: vehicle.id });

  const attrs = (vehicle.attributes ?? {}) as Record<string, unknown>;
  const categoryKey =
    typeof attrs.vehicleCategory === "string" ? attrs.vehicleCategory : "other";
  const categoryLabel =
    VEHICLE_CATEGORY_LABELS[categoryKey as VehicleCategory] ?? categoryKey;
  const brand = typeof attrs.brand === "string" ? attrs.brand : null;
  const model = typeof attrs.model === "string" ? attrs.model : null;
  const subtitle = [brand, model].filter(Boolean).join(" ") || null;
  const licensePlate =
    typeof attrs.licensePlate === "string" ? attrs.licensePlate : null;
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
      className={cn("min-w-0 max-w-full", isDragging && "z-10 opacity-90")}
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
          aria-label={`Presunúť ${vehicle.name}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>

        <Link
          href={vehiclePath(vehicle.id)}
          prefetch={false}
          className="flex h-full flex-col transition-colors hover:bg-muted/40"
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={vehicle.name}
              className="h-36 w-full object-cover"
            />
          ) : null}
          <div className="flex flex-col gap-3 p-4 pr-12">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-600/10">
                <CarFront className="size-5 text-blue-700" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{vehicle.name}</p>
                <Badge variant="secondary" className="mt-1">
                  {categoryLabel}
                </Badge>
                {subtitle ? (
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {subtitle}
                    {licensePlate ? ` · ${licensePlate}` : null}
                  </p>
                ) : licensePlate ? (
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {licensePlate}
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
