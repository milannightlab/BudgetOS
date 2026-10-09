import { z } from "zod";
import type { ModuleSlug } from "@/modules/registry";

export type ItemFieldInput = "text" | "number" | "date" | "select";

export type ItemFieldDefinition = {
  key: string;
  label: string;
  input: ItemFieldInput;
  options?: { value: string; label: string }[];
  optional?: boolean;
};

export type ItemTypeDefinition = {
  type: string;
  label: string;
  fields: ItemFieldDefinition[];
};

const genericType: ItemTypeDefinition = {
  type: "generic",
  label: "Všeobecná položka",
  fields: [
    { key: "notes", label: "Poznámky", input: "text", optional: true },
  ],
};

export const ITEM_TYPES_BY_MODULE: Record<ModuleSlug, ItemTypeDefinition[]> = {
  household: [
    {
      type: "property",
      label: "Nehnuteľnosť",
      fields: [
        {
          key: "propertyType",
          label: "Typ nehnuteľnosti",
          input: "select",
          optional: true,
          options: [
            { value: "house", label: "Rodinný dom" },
            { value: "apartment", label: "Byt" },
            { value: "cottage", label: "Chata / rekreačná nehnuteľnosť" },
            { value: "land", label: "Pozemok" },
            { value: "other", label: "Iné" },
          ],
        },
        { key: "address", label: "Adresa", input: "text", optional: true },
        {
          key: "relationshipType",
          label: "Vzťah k nehnuteľnosti",
          input: "select",
          optional: true,
          options: [
            { value: "own", label: "Vlastním" },
            { value: "rent", label: "Prenajímam" },
            { value: "manage", label: "Spravujem" },
          ],
        },
      ],
    },
    {
      type: "property_service",
      label: "Služba nehnuteľnosti",
      fields: [
        {
          key: "serviceType",
          label: "Typ služby",
          input: "select",
          optional: true,
          options: [
            { value: "electricity", label: "Elektrina" },
            { value: "water", label: "Voda" },
            { value: "gas", label: "Plyn" },
            { value: "internet", label: "Internet" },
            { value: "waste", label: "Odpad" },
            { value: "heating", label: "Vykurovanie" },
            { value: "building_manager", label: "Správca bytového domu" },
            { value: "repair_fund", label: "Fond opráv" },
            { value: "other", label: "Iné" },
          ],
        },
        {
          key: "contractNumber",
          label: "Číslo zmluvy",
          input: "text",
          optional: true,
        },
        {
          key: "customerNumber",
          label: "Zákaznícke / odberné číslo",
          input: "text",
          optional: true,
        },
        { key: "notes", label: "Poznámka", input: "text", optional: true },
      ],
    },
    genericType,
  ],
  children: [
    {
      type: "school",
      label: "Škola / škôlka",
      fields: [
        {
          key: "institutionName",
          label: "Názov inštitúcie",
          input: "text",
          optional: true,
        },
        {
          key: "associatedChild",
          label: "Dieťa",
          input: "text",
          optional: true,
        },
        { key: "classGrade", label: "Trieda / ročník", input: "text", optional: true },
      ],
    },
    {
      type: "extracurricular",
      label: "Krúžok / aktivita",
      fields: [
        { key: "activityName", label: "Názov aktivity", input: "text", optional: true },
        {
          key: "associatedChild",
          label: "Dieťa",
          input: "text",
          optional: true,
        },
        { key: "organizer", label: "Organizátor", input: "text", optional: true },
        { key: "location", label: "Miesto", input: "text", optional: true },
        { key: "frequency", label: "Frekvencia", input: "text", optional: true },
      ],
    },
    genericType,
  ],
  transport: [
    {
      type: "vehicle",
      label: "Vozidlo",
      fields: [
        { key: "brand", label: "Značka", input: "text", optional: true },
        { key: "model", label: "Model", input: "text", optional: true },
        { key: "year", label: "Rok", input: "number", optional: true },
        {
          key: "licensePlate",
          label: "EČV",
          input: "text",
          optional: true,
        },
        { key: "vin", label: "VIN", input: "text", optional: true },
        {
          key: "vehicleCategory",
          label: "Kategória",
          input: "text",
          optional: true,
        },
      ],
    },
    genericType,
  ],
  subscriptions: [
    {
      type: "subscription",
      label: "Predplatné",
      fields: [
        { key: "provider", label: "Poskytovateľ", input: "text", optional: true },
        { key: "planName", label: "Tarifa / plán", input: "text", optional: true },
        {
          key: "serviceCategory",
          label: "Kategória služby",
          input: "text",
          optional: true,
        },
        { key: "website", label: "Web", input: "text", optional: true },
      ],
    },
    genericType,
  ],
  insurance: [
    {
      type: "insurance_policy",
      label: "Poistná zmluva",
      fields: [
        {
          key: "insuranceCompany",
          label: "Poisťovňa",
          input: "text",
          optional: true,
        },
        { key: "policyNumber", label: "Číslo zmluvy", input: "text", optional: true },
        {
          key: "insuranceType",
          label: "Typ poistenia",
          input: "text",
          optional: true,
        },
        { key: "startDate", label: "Začiatok", input: "date", optional: true },
        { key: "endDate", label: "Koniec", input: "date", optional: true },
      ],
    },
    genericType,
  ],
  loans: [
    {
      type: "loan",
      label: "Úver",
      fields: [
        { key: "lender", label: "Veriteľ", input: "text", optional: true },
        { key: "loanType", label: "Typ úveru", input: "text", optional: true },
        {
          key: "originalPrincipal",
          label: "Pôvodná istina",
          input: "number",
          optional: true,
        },
        {
          key: "interestRate",
          label: "Úrok (%)",
          input: "number",
          optional: true,
        },
        {
          key: "maturityDate",
          label: "Splatnosť",
          input: "date",
          optional: true,
        },
      ],
    },
    genericType,
  ],
  investments: [
    {
      type: "investment",
      label: "Investícia",
      fields: [
        { key: "provider", label: "Poskytovateľ", input: "text", optional: true },
        {
          key: "instrumentType",
          label: "Typ nástroja",
          input: "text",
          optional: true,
        },
        { key: "notes", label: "Poznámky", input: "text", optional: true },
      ],
    },
    genericType,
  ],
  health: [
    {
      type: "healthcare_provider",
      label: "Zdravotný poskytovateľ",
      fields: [
        { key: "provider", label: "Poskytovateľ", input: "text", optional: true },
        {
          key: "associatedMember",
          label: "Člen rodiny",
          input: "text",
          optional: true,
        },
        { key: "notes", label: "Poznámky", input: "text", optional: true },
      ],
    },
    {
      type: "health_plan",
      label: "Zdravotný plán",
      fields: [
        { key: "provider", label: "Poskytovateľ", input: "text", optional: true },
        {
          key: "associatedMember",
          label: "Člen rodiny",
          input: "text",
          optional: true,
        },
        { key: "notes", label: "Poznámky", input: "text", optional: true },
      ],
    },
    genericType,
  ],
  personal: [
    {
      type: "identity_document",
      label: "Doklad totožnosti",
      fields: [
        {
          key: "documentType",
          label: "Typ dokladu",
          input: "select",
          optional: true,
          options: [
            { value: "id_card", label: "Občiansky preukaz" },
            { value: "passport", label: "Pas" },
            { value: "driving_license", label: "Vodičský preukaz" },
            { value: "birth_certificate", label: "Rodný list" },
            { value: "other", label: "Iné" },
          ],
        },
        { key: "number", label: "Číslo", input: "text", optional: true },
        {
          key: "expiryDate",
          label: "Platnosť do",
          input: "date",
          optional: true,
        },
        { key: "holder", label: "Držiteľ", input: "text", optional: true },
      ],
    },
    {
      type: "permit",
      label: "Povolenie",
      fields: [
        {
          key: "documentType",
          label: "Typ povolenia",
          input: "text",
          optional: true,
        },
        { key: "number", label: "Číslo", input: "text", optional: true },
        {
          key: "expiryDate",
          label: "Platnosť do",
          input: "date",
          optional: true,
        },
        { key: "holder", label: "Držiteľ", input: "text", optional: true },
      ],
    },
    genericType,
  ],
  travel: [
    {
      type: "trip",
      label: "Cesta / dovolenka",
      fields: [
        {
          key: "destination",
          label: "Destinácia",
          input: "text",
          optional: true,
        },
        { key: "startDate", label: "Začiatok", input: "date", optional: true },
        { key: "endDate", label: "Koniec", input: "date", optional: true },
        { key: "notes", label: "Poznámky", input: "text", optional: true },
      ],
    },
    {
      type: "leisure_pass",
      label: "Voľnočasový preukaz",
      fields: [
        { key: "location", label: "Miesto / poskytovateľ", input: "text", optional: true },
        { key: "startDate", label: "Začiatok", input: "date", optional: true },
        { key: "endDate", label: "Koniec", input: "date", optional: true },
        { key: "notes", label: "Poznámky", input: "text", optional: true },
      ],
    },
    genericType,
  ],
};

export function getItemTypesForModule(moduleSlug: ModuleSlug): ItemTypeDefinition[] {
  return ITEM_TYPES_BY_MODULE[moduleSlug] ?? [genericType];
}

export function getItemTypeDefinition(
  moduleSlug: ModuleSlug,
  type: string,
): ItemTypeDefinition | undefined {
  return getItemTypesForModule(moduleSlug).find((t) => t.type === type);
}

export function getAllItemTypeSlugs(): string[] {
  const set = new Set<string>();
  for (const types of Object.values(ITEM_TYPES_BY_MODULE)) {
    for (const t of types) set.add(t.type);
  }
  return [...set];
}

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export function buildAttributesSchema(typeDef: ItemTypeDefinition) {
  const shape: Record<string, z.ZodType> = {};
  for (const field of typeDef.fields) {
    let schema: z.ZodType;
    if (field.input === "number") {
      schema = z.coerce.number().optional().nullable();
    } else if (field.input === "date") {
      schema = z
        .string()
        .regex(dateRegex, "Neplatný dátum")
        .optional()
        .nullable()
        .or(z.literal(""));
    } else if (field.input === "select" && field.options?.length) {
      const values = field.options.map((o) => o.value) as [string, ...string[]];
      schema = z.enum(values).optional().nullable().or(z.literal(""));
    } else {
      schema = z.string().optional().nullable();
    }
    shape[field.key] = schema;
  }
  return z.object(shape).passthrough();
}

export function parseAttributes(
  typeDef: ItemTypeDefinition,
  raw: Record<string, unknown>,
): Record<string, unknown> {
  // Empty strings for numbers coerce to 0 — treat blank inputs as unset first.
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value === "" || value === null || value === undefined) continue;
    normalized[key] = value;
  }
  const parsed = buildAttributesSchema(typeDef).parse(normalized);
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (value === "" || value === null || value === undefined) continue;
    cleaned[key] = value;
  }
  return cleaned;
}

export const RELATION_TYPES = [
  { value: "related_to", label: "Súvisí s" },
  { value: "insures", label: "Poisťuje" },
  { value: "secures", label: "Zabezpečuje" },
  { value: "belongs_to", label: "Patrí k" },
] as const;

export function canRelateItems(sourceId: string, targetId: string): boolean {
  return sourceId.length > 0 && targetId.length > 0 && sourceId !== targetId;
}
