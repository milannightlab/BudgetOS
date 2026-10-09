import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AddTransactionSheet } from "@/components/add-transaction-sheet";
import { DocumentList } from "@/components/documents/document-list";
import { EmptyState } from "@/components/empty-state";
import { EventList } from "@/components/events/event-list";
import { AddDocumentSheet } from "@/components/modules/add-document-sheet";
import { AddEventSheet } from "@/components/modules/add-event-sheet";
import { EditPropertySheet } from "@/components/properties/edit-property-sheet";
import { ServiceCards } from "@/components/properties/service-cards";
import { PageHeader } from "@/components/page-header";
import { TransactionList } from "@/components/transaction-list";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { blobProxyUrl } from "@/lib/blob";
import { formatMoney, toNumber } from "@/lib/money";
import { propertiesModulePath } from "@/lib/property-paths";
import {
  PROPERTY_TYPE_LABELS,
  RELATIONSHIP_TYPE_LABELS,
  parseHiddenServiceTypes,
  type PropertyType,
} from "@/modules/property-services";

type Category = { id: string; name: string };

type ItemRow = {
  id: string;
  name: string;
  moduleId: string;
  attributes: Record<string, unknown> | null;
};

type Payment = {
  id: string;
  title: string;
  amount: string;
  type: "income" | "expense";
  status: "actual" | "planned";
  date: string;
  itemId?: string | null;
  category: { name: string; color: string };
};

type EventRow = {
  id: string;
  title: string;
  eventDate: string;
  type: "deadline" | "event" | "reminder";
  note: string | null;
  itemId?: string | null;
};

type DocRow = {
  id: string;
  title: string;
  fileName: string;
  size: number;
  blobUrl: string;
  createdAt: Date | string;
  itemId?: string | null;
};

export function PropertyDetail({
  workspaceId,
  currency,
  property,
  services,
  payments,
  events,
  docs,
  categories,
}: {
  workspaceId: string;
  currency: string;
  property: ItemRow;
  services: ItemRow[];
  payments: Payment[];
  events: EventRow[];
  docs: DocRow[];
  categories: Category[];
}) {
  const attrs = (property.attributes ?? {}) as Record<string, unknown>;
  const propertyType =
    typeof attrs.propertyType === "string" ? attrs.propertyType : "house";
  const typeLabel =
    PROPERTY_TYPE_LABELS[propertyType as PropertyType] ?? propertyType;
  const address = typeof attrs.address === "string" ? attrs.address : null;
  const imageUrl = blobProxyUrl(
    typeof attrs.imageUrl === "string" ? attrs.imageUrl : null,
  );
  const relationship =
    typeof attrs.relationshipType === "string"
      ? RELATIONSHIP_TYPE_LABELS[attrs.relationshipType] ?? null
      : null;
  const hidden = parseHiddenServiceTypes(attrs);

  const today = new Date().toISOString().slice(0, 10);
  const monthPrefix = today.slice(0, 7);
  const monthlyPlanned = payments.filter(
    (p) =>
      p.status === "planned" &&
      p.type === "expense" &&
      p.date.startsWith(monthPrefix),
  );
  const monthlyTotal = monthlyPlanned.reduce(
    (sum, p) => sum + toNumber(p.amount),
    0,
  );
  const upcomingEvents = events.filter((e) => e.eventDate >= today);

  const paymentByServiceId = new Map<
    string,
    { amount: string; title: string }
  >();
  for (const service of services) {
    const linked = payments.find(
      (p) => p.itemId === service.id && p.type === "expense",
    );
    if (linked) {
      paymentByServiceId.set(service.id, {
        amount: linked.amount,
        title: linked.title,
      });
    }
  }

  return (
    <div className="space-y-5">
      <Link
        href={propertiesModulePath()}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Späť na nehnuteľnosti
      </Link>

      <PageHeader
        title={property.name}
        description={address ?? undefined}
        action={
          <EditPropertySheet
            workspaceId={workspaceId}
            moduleId={property.moduleId}
            item={property}
          />
        }
      />

      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={property.name}
          className="h-48 w-full rounded-xl object-cover sm:h-64"
        />
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{typeLabel}</Badge>
        {relationship ? <Badge variant="outline">{relationship}</Badge> : null}
        {address ? <Badge variant="outline">{address}</Badge> : null}
      </div>

      <Card>
        <CardContent className="grid gap-4 pt-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">
              Plánované platby tento mesiac
            </p>
            <p className="mt-1 text-sm font-semibold">
              {monthlyPlanned.length === 0
                ? "—"
                : formatMoney(monthlyTotal, currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Nadchádzajúce termíny</p>
            <p className="mt-1 text-sm font-semibold">
              {upcomingEvents.length === 0 ? "—" : upcomingEvents.length}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Dokumenty</p>
            <p className="mt-1 text-sm font-semibold">
              {docs.length === 0 ? "—" : docs.length}
            </p>
          </div>
        </CardContent>
      </Card>

      <ServiceCards
        workspaceId={workspaceId}
        moduleId={property.moduleId}
        propertyId={property.id}
        propertyType={propertyType}
        hiddenServiceTypes={hidden}
        services={services}
        paymentByServiceId={paymentByServiceId}
        currency={currency}
      />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Platby</h2>
          <AddTransactionSheet
            workspaceId={workspaceId}
            categories={categories}
            moduleId={property.moduleId}
            itemId={property.id}
            label="Pridať platbu"
            variant="outline"
          />
        </div>
        {payments.length === 0 ? (
          <EmptyState
            title="Žiadne platby"
            description="Pridajte platbu viazanú na túto nehnuteľnosť."
          />
        ) : (
          <TransactionList
            items={payments}
            workspaceId={workspaceId}
            currency={currency}
            showItemLink={false}
          />
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Termíny</h2>
          <AddEventSheet
            workspaceId={workspaceId}
            moduleId={property.moduleId}
            itemId={property.id}
          />
        </div>
        {events.length === 0 ? (
          <EmptyState
            title="Žiadne termíny"
            description="Pridajte termín viazaný na túto nehnuteľnosť."
          />
        ) : (
          <EventList
            items={events}
            workspaceId={workspaceId}
            showItemLink={false}
          />
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Dokumenty</h2>
          <AddDocumentSheet
            workspaceId={workspaceId}
            moduleId={property.moduleId}
            itemId={property.id}
            events={events}
          />
        </div>
        {docs.length === 0 ? (
          <EmptyState
            title="Žiadne dokumenty"
            description="Nahrajte dokumenty viazané na túto nehnuteľnosť."
          />
        ) : (
          <DocumentList
            items={docs}
            workspaceId={workspaceId}
            showItemLink={false}
          />
        )}
      </section>
    </div>
  );
}
