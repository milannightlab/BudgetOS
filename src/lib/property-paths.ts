import { vehiclePath, vehicleServicePath } from "@/lib/vehicle-paths";

export function propertyPath(propertyId: string) {
  return `/modules/household/${propertyId}`;
}

export function propertyServicePath(propertyId: string, serviceId: string) {
  return `/modules/household/${propertyId}/services/${serviceId}`;
}

export function propertiesModulePath() {
  return "/modules/household";
}

/** Canonical detail URL for any typed item. */
export function itemDetailPath(item: {
  id: string;
  type: string;
  parentPropertyId?: string | null;
  parentItemId?: string | null;
}) {
  const parentId = item.parentItemId ?? item.parentPropertyId ?? null;
  if (item.type === "property") return propertyPath(item.id);
  if (item.type === "vehicle") return vehiclePath(item.id);
  if (
    (item.type === "property_service" || item.type === "household_service") &&
    parentId
  ) {
    return propertyServicePath(parentId, item.id);
  }
  if (item.type === "vehicle_service" && parentId) {
    return vehicleServicePath(parentId, item.id);
  }
  return `/items/${item.id}`;
}
