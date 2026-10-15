export type AgendaItemKind = "payment" | "event";

export type AgendaDisplayItem = {
  id: string;
  name: string;
  type: string;
  imageUrl: string | null;
  moduleLabel: string | null;
  /** Module slug for icon fallback (e.g. household, transport). */
  moduleSlug: string | null;
  color: string | null;
  /** Proxy URL for the item's vendor logo, when the service has one. */
  vendorLogoUrl: string | null;
  /** Service/item category key for icon placeholder (e.g. electricity). */
  categoryKey: string | null;
};

export type UpcomingAgendaItem = {
  id: string;
  entityId: string;
  kind: AgendaItemKind;
  status: "open" | "done";
  date: string;
  title: string;
  description: string;
  note: string | null;
  categoryName: string | null;
  categoryId: string | null;
  amount: string | null;
  amountType: "income" | "expense" | null;
  eventType: "deadline" | "event" | "reminder" | null;
  /** Raw linked item id on the entity (may differ from display item for services). */
  itemId: string | null;
  href: string | null;
  item: AgendaDisplayItem | null;
  recurringPaymentId: string | null;
  recurringFrequency: "weekly" | "monthly" | "yearly" | null;
  recurringEndDate: string | null;
};
