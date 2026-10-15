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
import { EditVehicleServiceSheet } from "@/components/vehicles/edit-vehicle-service-sheet";
import { blobProxyUrl } from "@/lib/blob";
import type { VendorListItem } from "@/lib/queries";
import { vehiclePath, vehiclesModulePath } from "@/lib/vehicle-paths";
import { getVehicleServiceTemplate } from "@/modules/vehicle-services";

type Category = { id: string; name: string };

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

export function VehicleServiceDetail({
  workspaceId,
  currency,
  service,
  parentVehicleId,
  parentVehicleName,
  payments,
  events,
  docs,
  categories,
}: {
  workspaceId: string;
  currency: string;
  service: {
    id: string;
    name: string;
    moduleId: string;
    vendorId?: string | null;
    attributes: Record<string, unknown> | null;
    vendor?: VendorListItem | null;
  };
  parentVehicleId: string | null;
  parentVehicleName: string | null;
  payments: Payment[];
  events: EventRow[];
  docs: DocRow[];
  categories: Category[];
}) {
  const attrs = (service.attributes ?? {}) as Record<string, unknown>;
  const serviceType =
    typeof attrs.serviceType === "string" ? attrs.serviceType : "other";
  const template = getVehicleServiceTemplate(serviceType);
  const vendor = service.vendor ?? null;
  const providerName =
    vendor?.displayName ??
    (typeof attrs.provider === "string" ? attrs.provider : null);
  const logoSrc = blobProxyUrl(vendor?.logoUrl);
  const contractNumber =
    typeof attrs.contractNumber === "string" ? attrs.contractNumber : null;
  const customerNumber =
    typeof attrs.customerNumber === "string" ? attrs.customerNumber : null;
  const notes = typeof attrs.notes === "string" ? attrs.notes : null;

  const crumbs = [
    { label: "Vozidlá", href: vehiclesModulePath() },
    ...(parentVehicleId
      ? [
          {
            label: parentVehicleName ?? "Vozidlo",
            href: vehiclePath(parentVehicleId),
          },
        ]
      : []),
    { label: service.name },
  ];

  return (
    <div className="space-y-5">
      <MobileBackCrumb crumbs={crumbs} />

      <PageHeader
        title={service.name}
        description={providerName ?? undefined}
        action={
          <EditVehicleServiceSheet
            workspaceId={workspaceId}
            service={service}
          />
        }
      />

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">
          {template?.label ?? "Služba vozidla"}
        </Badge>
        {providerName ? <Badge variant="outline">{providerName}</Badge> : null}
      </div>

      <Card>
        <CardContent className="grid gap-3 pt-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <p className="text-xs text-muted-foreground">Dodávateľ</p>
            <div className="mt-1 flex items-center gap-2">
              {logoSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoSrc}
                  alt=""
                  className="size-8 rounded object-contain"
                />
              ) : null}
              <div className="min-w-0">
                <p className="text-sm font-medium">{providerName || "—"}</p>
                {vendor?.website ? (
                  <a
                    href={vendor.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    {vendor.website.replace(/^https?:\/\//, "")}
                  </a>
                ) : null}
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Číslo zmluvy</p>
            <p className="text-sm font-medium">{contractNumber || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              Zákaznícke / odberné číslo
            </p>
            <p className="text-sm font-medium">{customerNumber || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Poznámka</p>
            <p className="text-sm font-medium">{notes || "—"}</p>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Platby</h2>
          <AddTransactionSheet
            workspaceId={workspaceId}
            categories={categories}
            moduleId={service.moduleId}
            itemId={service.id}
            lockedItemLabel={
              providerName
                ? `${service.name} (${providerName})`
                : service.name
            }
            label="Pridať platbu"
            variant="outline"
          />
        </div>
        {payments.length === 0 ? (
          <EmptyState
            title="Žiadne platby"
            description="Pridajte platbu viazanú na túto službu."
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
            moduleId={service.moduleId}
            itemId={service.id}
          />
        </div>
        {events.length === 0 ? (
          <EmptyState
            title="Žiadne termíny"
            description="Pridajte termín viazaný na túto službu."
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
            moduleId={service.moduleId}
            itemId={service.id}
            events={events}
          />
        </div>
        {docs.length === 0 ? (
          <EmptyState
            title="Žiadne dokumenty"
            description="Nahrajte dokumenty viazané na túto službu."
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
