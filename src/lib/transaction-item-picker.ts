import {
  getModuleBySlug,
  getModulesSorted,
  type ModuleSlug,
} from "@/modules/registry";
import { getServiceTemplate } from "@/modules/property-services";
import { getVehicleServiceTemplate } from "@/modules/vehicle-services";

export type TransactionItemOption = {
  id: string;
  label: string;
  moduleId: string;
  /** 0 = top-level item, 1 = nested child (service / related item). */
  depth: number;
  parentId?: string | null;
};

export type TransactionItemOptionGroup = {
  id: string;
  label: string;
  options: TransactionItemOption[];
};

export type PickerItemRow = {
  id: string;
  name: string;
  type: string;
  moduleId: string;
  status: string;
  attributes: Record<string, unknown> | null;
  /** Parent via belongs_to relation. */
  parentItemId?: string | null;
  /** @deprecated Use parentItemId. */
  parentPropertyId?: string | null;
};

export type PickerModuleRow = {
  id: string;
  slug: string;
  enabled?: boolean;
  sortOrder?: number;
};

/**
 * When set, only these types appear as roots for the module.
 * Other types nest under a parent via belongs_to (or show as orphans).
 */
const PRIMARY_ROOT_TYPES: Partial<Record<ModuleSlug, readonly string[]>> = {
  household: ["property"],
  transport: ["vehicle"],
};

function moduleSlugById(modules: PickerModuleRow[]) {
  return new Map(modules.map((m) => [m.id, m.slug]));
}

function parentIdOf(item: PickerItemRow) {
  return item.parentItemId ?? item.parentPropertyId ?? null;
}

function optionLabel(item: PickerItemRow) {
  const serviceType =
    typeof item.attributes?.serviceType === "string"
      ? item.attributes.serviceType
      : null;
  if (
    serviceType &&
    (item.type === "property_service" || item.type === "household_service")
  ) {
    const template = getServiceTemplate(serviceType);
    if (template) return template.label;
  }
  if (serviceType && item.type === "vehicle_service") {
    const template = getVehicleServiceTemplate(serviceType);
    if (template) return template.label;
  }
  return item.name;
}

function isPrimaryRoot(item: PickerItemRow, slug: string | undefined) {
  if (!slug) return true;
  const allowed = PRIMARY_ROOT_TYPES[slug as ModuleSlug];
  if (!allowed) return true;
  return allowed.includes(item.type);
}

/** Build grouped item options for payment assignment dropdowns. */
export function buildTransactionItemPickerGroups(
  items: PickerItemRow[],
  modules: PickerModuleRow[],
  options?: { filterModuleId?: string | null },
): TransactionItemOptionGroup[] {
  const slugByModuleId = moduleSlugById(modules);
  let active = items.filter((i) => i.status === "active");

  if (options?.filterModuleId) {
    active = active.filter((i) => i.moduleId === options.filterModuleId);
  }

  const moduleOrder = new Map<string, number>();
  for (const def of getModulesSorted()) {
    const row = modules.find((m) => m.slug === def.slug);
    if (row) moduleOrder.set(row.id, def.order);
  }

  const moduleIds = [...new Set(active.map((i) => i.moduleId))].sort(
    (a, b) => (moduleOrder.get(a) ?? 999) - (moduleOrder.get(b) ?? 999),
  );

  const groups: TransactionItemOptionGroup[] = [];

  for (const moduleId of moduleIds) {
    const slug = slugByModuleId.get(moduleId);
    const moduleDef = slug ? getModuleBySlug(slug) : undefined;
    const moduleLabel = moduleDef?.label ?? "Modul";
    const inModule = active.filter((i) => i.moduleId === moduleId);
    if (inModule.length === 0) continue;

    const idsInModule = new Set(inModule.map((i) => i.id));
    const childrenByParent = new Map<string, PickerItemRow[]>();
    const nestedIds = new Set<string>();

    for (const item of inModule) {
      const parentId = parentIdOf(item);
      if (!parentId || !idsInModule.has(parentId) || parentId === item.id) {
        continue;
      }
      const list = childrenByParent.get(parentId) ?? [];
      list.push(item);
      childrenByParent.set(parentId, list);
      nestedIds.add(item.id);
    }

    for (const [, children] of childrenByParent) {
      children.sort((a, b) =>
        optionLabel(a).localeCompare(optionLabel(b), "sk"),
      );
    }

    const roots = inModule
      .filter((item) => !nestedIds.has(item.id) && isPrimaryRoot(item, slug))
      .sort((a, b) => a.name.localeCompare(b.name, "sk"));

    const optionsForModule: TransactionItemOption[] = [];
    const emitted = new Set<string>();

    function emitRoot(item: PickerItemRow) {
      if (emitted.has(item.id)) return;
      emitted.add(item.id);
      optionsForModule.push({
        id: item.id,
        label: optionLabel(item),
        moduleId: item.moduleId,
        depth: 0,
        parentId: null,
      });

      for (const child of childrenByParent.get(item.id) ?? []) {
        if (emitted.has(child.id)) continue;
        emitted.add(child.id);
        optionsForModule.push({
          id: child.id,
          label: optionLabel(child),
          moduleId: child.moduleId,
          depth: 1,
          parentId: item.id,
        });
      }
    }

    for (const root of roots) {
      emitRoot(root);
    }

    // Non-primary / orphan items that weren't nested under a root.
    const leftovers = inModule
      .filter((item) => !emitted.has(item.id))
      .sort((a, b) => optionLabel(a).localeCompare(optionLabel(b), "sk"));

    for (const item of leftovers) {
      const parentId = parentIdOf(item);
      const parentEmitted =
        parentId && emitted.has(parentId)
          ? optionsForModule.find((o) => o.id === parentId)
          : null;

      if (parentEmitted) {
        emitted.add(item.id);
        // Insert after parent block if somehow missed — append as nested.
        optionsForModule.push({
          id: item.id,
          label: optionLabel(item),
          moduleId: item.moduleId,
          depth: 1,
          parentId: parentEmitted.id,
        });
        continue;
      }

      emitRoot(item);
    }

    if (optionsForModule.length === 0) continue;

    groups.push({
      id: moduleId,
      label: moduleLabel,
      options: optionsForModule,
    });
  }

  return groups;
}

export function findTransactionItemOptionLabel(
  groups: TransactionItemOptionGroup[],
  itemId: string,
): string | null {
  for (const group of groups) {
    const hit = group.options.find((o) => o.id === itemId);
    if (!hit) continue;
    if (hit.depth > 0 && hit.parentId) {
      const parent = group.options.find((o) => o.id === hit.parentId);
      if (parent) {
        return `${group.label}: ${parent.label} › ${hit.label}`;
      }
    }
    return `${group.label}: ${hit.label}`;
  }
  return null;
}

export function findTransactionItemModuleId(
  groups: TransactionItemOptionGroup[],
  itemId: string,
): string | null {
  for (const group of groups) {
    const hit = group.options.find((o) => o.id === itemId);
    if (hit) return hit.moduleId;
  }
  return null;
}

export const TRANSACTION_ITEM_NONE = "__none__" as const;
