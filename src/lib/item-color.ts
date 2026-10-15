export const DEFAULT_ITEM_COLOR = "#0f766e";

export const ITEM_COLOR_PRESETS = [
  "#0f766e",
  "#2563eb",
  "#c026d3",
  "#ea580c",
  "#ca8a04",
  "#dc2626",
  "#64748b",
  "#0891b2",
] as const;

const HEX_COLOR = /^#([0-9a-fA-F]{6})$/;

export function parseItemColor(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!HEX_COLOR.test(value)) return null;
  return value.toLowerCase();
}

export function readItemColor(
  attributes: Record<string, unknown> | null | undefined,
): string | null {
  return parseItemColor(attributes?.color);
}

export function itemColorOrDefault(
  attributes: Record<string, unknown> | null | undefined,
): string {
  return readItemColor(attributes) ?? DEFAULT_ITEM_COLOR;
}
