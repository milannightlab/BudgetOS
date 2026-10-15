"use client";

import { useMemo, useOptimistic, useTransition } from "react";
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
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import {
  reorderModulesAction,
  setModuleEnabledAction,
} from "@/actions/modules";
import { Label } from "@/components/ui/label";
import {
  getModuleNavIcon,
  OVERVIEW_NAV_KEY,
  type ModuleNavKey,
} from "@/lib/module-nav";
import { cn } from "@/lib/utils";
import type { ModuleSlug } from "@/modules/registry";

export type ModuleToggleRow = {
  key: ModuleNavKey;
  label: string;
  description: string;
  enabled: boolean;
  /** Overview cannot be disabled. */
  canDisable: boolean;
};

export function ModuleToggles({
  workspaceId,
  modules,
}: {
  workspaceId: string;
  modules: ModuleToggleRow[];
}) {
  const [pending, startTransition] = useTransition();
  const [ordered, setOptimisticOrder] = useOptimistic(
    modules,
    (_current, next: ModuleToggleRow[]) => next,
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const ids = useMemo(() => ordered.map((m) => m.key), [ordered]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = ordered.findIndex((m) => m.key === active.id);
    const newIndex = ordered.findIndex((m) => m.key === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(ordered, oldIndex, newIndex);
    startTransition(async () => {
      setOptimisticOrder(next);
      await reorderModulesAction(
        workspaceId,
        next.map((m) => m.key),
      );
    });
  }

  return (
    <div className="overflow-x-clip">
      <DndContext
        id="modules-sortable"
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToParentElement]}
        autoScroll={{
          threshold: { x: 0, y: 0.2 },
          layoutShiftCompensation: false,
        }}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ul className={cn("space-y-2", pending && "opacity-90")}>
            {ordered.map((mod) => (
              <SortableModuleRow
                key={mod.key}
                module={mod}
                workspaceId={workspaceId}
                disabled={pending}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableModuleRow({
  module: mod,
  workspaceId,
  disabled,
}: {
  module: ModuleToggleRow;
  workspaceId: string;
  disabled: boolean;
}) {
  const [togglePending, startToggle] = useTransition();
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: mod.key });

  const Icon = getModuleNavIcon(mod.key);

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      className={cn(
        "flex items-start justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-sm",
        isDragging && "z-10 opacity-90 shadow-md ring-2 ring-primary/20",
      )}
    >
      <div className="flex min-w-0 items-start gap-2">
        <button
          type="button"
          ref={setActivatorNodeRef}
          className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground touch-none"
          aria-label={`Presunúť ${mod.label}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
        {Icon ? (
          <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        ) : null}
        <div className="min-w-0">
          <Label htmlFor={`mod-${mod.key}`} className="font-medium">
            {mod.label}
          </Label>
          <p className="text-xs text-muted-foreground">{mod.description}</p>
        </div>
      </div>
      {mod.canDisable ? (
        <input
          id={`mod-${mod.key}`}
          type="checkbox"
          className="mt-1 size-4 shrink-0 accent-primary"
          checked={mod.enabled}
          disabled={disabled || togglePending}
          onChange={(e) => {
            const next = e.target.checked;
            startToggle(async () => {
              await setModuleEnabledAction(
                workspaceId,
                mod.key as ModuleSlug,
                next,
              );
            });
          }}
        />
      ) : (
        <span className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Vždy
        </span>
      )}
    </li>
  );
}

export { OVERVIEW_NAV_KEY };
