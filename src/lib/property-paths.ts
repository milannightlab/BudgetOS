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
}) {
  if (item.type === "property") return propertyPath(item.id);
  if (
    (item.type === "property_service" || item.type === "household_service") &&
    item.parentPropertyId
  ) {
    return propertyServicePath(item.parentPropertyId, item.id);
  }
  return `/items/${item.id}`;
}
