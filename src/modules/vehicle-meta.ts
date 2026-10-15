export const VEHICLE_CATEGORY_LABELS = {
  car: "Osobné auto",
  motorcycle: "Motocykel",
  bicycle: "Bicykel",
  scooter: "Skúter",
  van: "Dodávka",
  other: "Iné",
} as const;

export type VehicleCategory = keyof typeof VEHICLE_CATEGORY_LABELS;

export const VEHICLE_CATEGORIES = Object.entries(VEHICLE_CATEGORY_LABELS).map(
  ([value, label]) => ({ value, label }),
);
