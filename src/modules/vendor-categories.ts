export type VendorCategoryDef = {
  key: string;
  label: string;
};

/** Central catalog of vendor service categories (SK labels). */
export const VENDOR_CATEGORIES: readonly VendorCategoryDef[] = [
  { key: "electricity", label: "Elektrina" },
  { key: "water", label: "Voda" },
  { key: "gas", label: "Plyn" },
  { key: "internet", label: "Internet" },
  { key: "mobile", label: "Mobil" },
  { key: "waste", label: "Odpad" },
  { key: "heating", label: "Vykurovanie" },
  { key: "building_manager", label: "Správca bytového domu" },
  { key: "insurance_home", label: "Poistenie nehnuteľnosti" },
  { key: "insurance_car", label: "Poistenie vozidla" },
  { key: "insurance_life", label: "Životné poistenie" },
  { key: "banking", label: "Bankovníctvo" },
  { key: "subscription", label: "Predplatné" },
  { key: "other", label: "Iné" },
] as const;

export type VendorCategoryKey = (typeof VENDOR_CATEGORIES)[number]["key"];

const KEY_SET = new Set(VENDOR_CATEGORIES.map((c) => c.key));

export function isVendorCategoryKey(key: string): key is VendorCategoryKey {
  return KEY_SET.has(key as VendorCategoryKey);
}

export function getVendorCategoryLabel(key: string): string {
  return VENDOR_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

/** Map property serviceType → vendor category for filtering. */
export function vendorCategoryForServiceType(
  serviceType: string,
): VendorCategoryKey | null {
  if (serviceType === "repair_fund") return null;
  if (isVendorCategoryKey(serviceType)) return serviceType;
  return "other";
}
