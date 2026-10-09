import type { LucideIcon } from "lucide-react";
import {
  Baby,
  CarFront,
  ChartNoAxesCombined,
  Contact,
  HeartPulse,
  House,
  Landmark,
  Plane,
  Repeat,
  ShieldCheck,
} from "lucide-react";

export type ModuleSlug =
  | "household"
  | "children"
  | "transport"
  | "subscriptions"
  | "insurance"
  | "loans"
  | "investments"
  | "health"
  | "personal"
  | "travel";

export type ModuleDefinition = {
  slug: ModuleSlug;
  label: string;
  href: string;
  icon: LucideIcon;
  color: string;
  description: string;
  order: number;
  defaultEnabled: boolean;
};

export const MODULES: readonly ModuleDefinition[] = [
  {
    slug: "household",
    label: "Nehnuteľnosti",
    href: "/modules/household",
    icon: House,
    color: "#0f766e",
    description:
      "Dom, byt alebo pozemok — platby, termíny a dokumenty na jednom mieste",
    order: 1,
    defaultEnabled: true,
  },
  {
    slug: "children",
    label: "Deti",
    href: "/modules/children",
    icon: Baby,
    color: "#c026d3",
    description: "Školy, krúžky, tábory a vzdelávacie aktivity",
    order: 2,
    defaultEnabled: true,
  },
  {
    slug: "transport",
    label: "Vozidlá",
    href: "/modules/transport",
    icon: CarFront,
    color: "#2563eb",
    description: "Autá, bicykle, údržba, STK a parkovanie",
    order: 3,
    defaultEnabled: true,
  },
  {
    slug: "subscriptions",
    label: "Predplatné a členstvá",
    href: "/modules/subscriptions",
    icon: Repeat,
    color: "#ea580c",
    description: "Streaming, softvér, tarify a členstvá",
    order: 4,
    defaultEnabled: true,
  },
  {
    slug: "insurance",
    label: "Poistenie",
    href: "/modules/insurance",
    icon: ShieldCheck,
    color: "#0891b2",
    description: "Životné, majetkové, cestovné a iné poistky",
    order: 5,
    defaultEnabled: true,
  },
  {
    slug: "loans",
    label: "Úvery a záväzky",
    href: "/modules/loans",
    icon: Landmark,
    color: "#dc2626",
    description: "Hypotéky, spotrebné úvery, leasing a záväzky",
    order: 6,
    defaultEnabled: true,
  },
  {
    slug: "investments",
    label: "Úspory a investície",
    href: "/modules/investments",
    icon: ChartNoAxesCombined,
    color: "#16a34a",
    description: "Sporenie, investície, ETF a dôchodkové produkty",
    order: 7,
    defaultEnabled: true,
  },
  {
    slug: "health",
    label: "Zdravie",
    href: "/modules/health",
    icon: HeartPulse,
    color: "#e11d48",
    description: "Prehliadky, očkovania, zdravotné služby a termíny",
    order: 8,
    defaultEnabled: true,
  },
  {
    slug: "personal",
    label: "Osobné a administratíva",
    href: "/modules/personal",
    icon: Contact,
    color: "#7c3aed",
    description: "Doklady, povolenia a administratívne povinnosti",
    order: 9,
    defaultEnabled: true,
  },
  {
    slug: "travel",
    label: "Cestovanie a voľný čas",
    href: "/modules/travel",
    icon: Plane,
    color: "#0284c7",
    description: "Dovolenky, výlety, rezervácie a voľnočasové aktivity",
    order: 10,
    defaultEnabled: true,
  },
] as const;

export const MODULE_SLUGS = MODULES.map((m) => m.slug);

export function getModuleBySlug(slug: string): ModuleDefinition | undefined {
  return MODULES.find((m) => m.slug === slug);
}

export function isModuleSlug(slug: string): slug is ModuleSlug {
  return MODULE_SLUGS.includes(slug as ModuleSlug);
}

export function getModulesSorted(): ModuleDefinition[] {
  return [...MODULES].sort((a, b) => a.order - b.order);
}
