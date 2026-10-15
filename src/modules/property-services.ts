import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Droplets,
  Flame,
  Heater,
  Landmark,
  Trash2,
  Wallet,
  Wifi,
  Zap,
} from "lucide-react";

export type PropertyType =
  | "house"
  | "apartment"
  | "cottage"
  | "land"
  | "other";

export type ServiceTemplate = {
  serviceType: string;
  label: string;
  icon: LucideIcon;
};

const CORE_SERVICES: ServiceTemplate[] = [
  { serviceType: "electricity", label: "Elektrina", icon: Zap },
  { serviceType: "water", label: "Voda", icon: Droplets },
  { serviceType: "gas", label: "Plyn", icon: Flame },
  { serviceType: "internet", label: "Internet", icon: Wifi },
  { serviceType: "waste", label: "Odpad", icon: Trash2 },
  { serviceType: "heating", label: "Vykurovanie", icon: Heater },
  { serviceType: "mortgage", label: "Hypotéka", icon: Landmark },
];

const APARTMENT_EXTRA: ServiceTemplate[] = [
  {
    serviceType: "building_manager",
    label: "Správca bytového domu",
    icon: Building2,
  },
  { serviceType: "repair_fund", label: "Fond opráv", icon: Wallet },
];

const LAND_SERVICES: ServiceTemplate[] = [
  { serviceType: "water", label: "Voda", icon: Droplets },
  { serviceType: "waste", label: "Odpad", icon: Trash2 },
  { serviceType: "other", label: "Iné", icon: Building2 },
];

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  house: "Rodinný dom",
  apartment: "Byt",
  cottage: "Chata / rekreačná nehnuteľnosť",
  land: "Pozemok",
  other: "Iné",
};

export const RELATIONSHIP_TYPE_LABELS: Record<string, string> = {
  own: "Vlastním",
  rent: "Prenajímam",
  manage: "Spravujem",
};

export function getServiceTemplatesForPropertyType(
  propertyType: string | undefined | null,
): ServiceTemplate[] {
  switch (propertyType) {
    case "apartment":
      return [...CORE_SERVICES, ...APARTMENT_EXTRA];
    case "land":
      return LAND_SERVICES;
    case "house":
    case "cottage":
    case "other":
    default:
      return CORE_SERVICES;
  }
}

export function getServiceTemplate(
  serviceType: string,
): ServiceTemplate | undefined {
  return (
    [...CORE_SERVICES, ...APARTMENT_EXTRA, ...LAND_SERVICES].find(
      (s) => s.serviceType === serviceType,
    ) ?? undefined
  );
}

export function parseHiddenServiceTypes(attributes: Record<string, unknown>) {
  const raw = attributes.hiddenServiceTypes;
  if (!Array.isArray(raw)) return [] as string[];
  return raw.filter((v): v is string => typeof v === "string");
}
