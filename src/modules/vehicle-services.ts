import type { LucideIcon } from "lucide-react";
import { Landmark, Shield, ShieldPlus } from "lucide-react";

export type VehicleServiceTemplate = {
  serviceType: string;
  label: string;
  icon: LucideIcon;
};

export const VEHICLE_SERVICE_TEMPLATES: VehicleServiceTemplate[] = [
  { serviceType: "pzp", label: "PZP", icon: Shield },
  {
    serviceType: "comprehensive",
    label: "Havarijné poistenie",
    icon: ShieldPlus,
  },
  { serviceType: "leasing", label: "Leasing/Úver", icon: Landmark },
];

export function getVehicleServiceTemplates(): VehicleServiceTemplate[] {
  return VEHICLE_SERVICE_TEMPLATES;
}

export function getVehicleServiceTemplate(
  serviceType: string,
): VehicleServiceTemplate | undefined {
  return VEHICLE_SERVICE_TEMPLATES.find((s) => s.serviceType === serviceType);
}

export function parseHiddenVehicleServiceTypes(
  attributes: Record<string, unknown>,
) {
  const raw = attributes.hiddenServiceTypes;
  if (!Array.isArray(raw)) return [] as string[];
  return raw.filter((v): v is string => typeof v === "string");
}
