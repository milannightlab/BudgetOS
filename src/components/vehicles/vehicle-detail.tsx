import { MobileBackCrumb } from "@/components/app-breadcrumbs";
import { AddTransactionSheet } from "@/components/add-transaction-sheet";
import { DocumentList } from "@/components/documents/document-list";
import { EmptyState } from "@/components/empty-state";
import { EventList } from "@/components/events/event-list";
import { AddDocumentSheet } from "@/components/modules/add-document-sheet";
import { AddEventSheet } from "@/components/modules/add-event-sheet";
import { PageHeader } from "@/components/page-header";
import { TransactionList } from "@/components/transaction-list";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EditVehicleSheet } from "@/components/vehicles/edit-vehicle-sheet";
import { VehicleServiceCards } from "@/components/vehicles/vehicle-service-cards";
import { blobProxyUrl } from "@/lib/blob";
import { formatMoney, toNumber } from "@/lib/money";
import { vehiclesModulePath } from "@/lib/vehicle-paths";
import {
  VEHICLE_CATEGORY_LABELS,
  type VehicleCategory,
} from "@/modules/vehicle-meta";
import { parseHiddenVehicleServiceTypes } from "@/modules/vehicle-services";

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

export function VehicleDetail({
  workspaceId,
  currency,
  vehicle,
  services,
  payments,
  events,
  docs,
  categories,
}: {
  workspaceId: string;
  currency: string;
  vehicle: ItemRow;
  services: ItemRow[];
  payments: Payment[];
  events: EventRow[];
  docs: DocRow[];
  categories: Category[];
}) {
  const attrs = (vehicle.attributes ?? {}) as Record<string, unknown>;
  const categoryKey =
    typeof attrs.vehicleCategory === "string" ? attrs.vehicleCategory : "car";
  const categoryLabel =
    VEHICLE_CATEGORY_LABELS[categoryKey as VehicleCategory] ?? categoryKey;
  const brand = typeof attrs.brand === "string" ? attrs.brand : null;
  const model = typeof attrs.model === "string" ? attrs.model : null;
  const year =
    typeof attrs.year === "number" || typeof attrs.year === "string"
      ? String(attrs.year)
      : null;
  const licensePlate =
    typeof attrs.licensePlate === "string" ? attrs.licensePlate : null;
  const vin = typeof attrs.vin === "string" ? attrs.vin : null;
  const subtitle = [brand, model, year].filter(Boolean).join(" ") || null;
  const imageUrl = blobProxyUrl(
    typeof attrs.imageUrl === "string" ? attrs.imageUrl : null,
  );
  const hidden = parseHiddenVehicleServiceTypes(attrs);

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

  const crumbs = [
    { label: "Vozidlá", href: vehiclesModulePath() },
    { label: vehicle.name },
  ];

  return (
    <div className="space-y-5">
      <MobileBackCrumb crumbs={crumbs} />

      <div className="flex gap-4">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={vehicle.name}
            className="size-24 shrink-0 rounded-xl object-cover sm:size-32"
          />
        ) : null}
        <div className="min-w-0 flex-1 space-y-3">
          <PageHeader
            title={vehicle.name}
            description={subtitle ?? undefined}
            action={
              <EditVehicleSheet
                workspaceId={workspaceId}
                moduleId={vehicle.moduleId}
                item={vehicle}
              />
            }
          />
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{categoryLabel}</Badge>
            {licensePlate ? (
              <Badge variant="outline">{licensePlate}</Badge>
            ) : null}
            {vin ? <Badge variant="outline">VIN {vin}</Badge> : null}
          </div>
        </div>
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

      <VehicleServiceCards
        workspaceId={workspaceId}
        moduleId={vehicle.moduleId}
        vehicleId={vehicle.id}
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
            moduleId={vehicle.moduleId}
            itemId={vehicle.id}
            lockedItemLabel={vehicle.name}
            label="Pridať platbu"
            variant="outline"
          />
        </div>
        {payments.length === 0 ? (
          <EmptyState
            title="Žiadne platby"
            description="Pridajte platbu viazanú na toto vozidlo."
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
            moduleId={vehicle.moduleId}
            itemId={vehicle.id}
          />
        </div>
        {events.length === 0 ? (
          <EmptyState
            title="Žiadne termíny"
            description="Pridajte termín viazaný na toto vozidlo."
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
            moduleId={vehicle.moduleId}
            itemId={vehicle.id}
            events={events}
          />
        </div>
        {docs.length === 0 ? (
          <EmptyState
            title="Žiadne dokumenty"
            description="Nahrajte dokumenty viazané na toto vozidlo."
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
