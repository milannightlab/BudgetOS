"use client";

import { useTransition } from "react";
import Link from "next/link";
import { EyeOff, Plus } from "lucide-react";
import { hideVehicleServiceTypeAction } from "@/actions/vehicles";
import { ConfigureVehicleServiceSheet } from "@/components/vehicles/configure-vehicle-service-sheet";
import { Button } from "@/components/ui/button";
import {
  getVehicleServiceTemplates,
  type VehicleServiceTemplate,
} from "@/modules/vehicle-services";
import { blobProxyUrl } from "@/lib/blob";
import { formatMoney, toNumber } from "@/lib/money";
import {
  vehicleServicePath,
} from "@/lib/vehicle-paths";

type ServiceItem = {
  id: string;
  name: string;
  attributes: Record<string, unknown> | null;
  vendor?: { displayName: string; logoUrl?: string | null } | null;
};

export function VehicleServiceCards({
  workspaceId,
  moduleId,
  vehicleId,
  hiddenServiceTypes,
  services,
  paymentByServiceId,
  currency = "EUR",
}: {
  workspaceId: string;
  moduleId: string;
  vehicleId: string;
  hiddenServiceTypes: string[];
  services: ServiceItem[];
  paymentByServiceId: Map<string, { amount: string; title: string }>;
  currency?: string;
}) {
  const [pending, startTransition] = useTransition();
  const hidden = new Set(hiddenServiceTypes);

  const byType = new Map<string, ServiceItem>();
  const custom: ServiceItem[] = [];
  for (const service of services) {
    const attrs = (service.attributes ?? {}) as Record<string, unknown>;
    const type =
      typeof attrs.serviceType === "string" ? attrs.serviceType : "other";
    if (type !== "other" && !byType.has(type)) {
      byType.set(type, service);
    } else {
      custom.push(service);
    }
  }

  const templates = getVehicleServiceTemplates().filter(
    (t) => byType.has(t.serviceType) || !hidden.has(t.serviceType),
  );

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Služby</h2>
        <ConfigureVehicleServiceSheet
          workspaceId={workspaceId}
          moduleId={moduleId}
          vehicleId={vehicleId}
          serviceType="other"
          defaultName="Vlastná služba"
          trigger={
            <Button size="sm" variant="outline" className="gap-1">
              <Plus className="size-4" />
              Vlastná služba
            </Button>
          }
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => {
          const configured = byType.get(template.serviceType);
          return (
            <ServiceCard
              key={template.serviceType}
              template={template}
              configured={configured}
              payment={
                configured
                  ? paymentByServiceId.get(configured.id)
                  : undefined
              }
              currency={currency}
              workspaceId={workspaceId}
              moduleId={moduleId}
              vehicleId={vehicleId}
              pending={pending}
              onHide={() => {
                startTransition(async () => {
                  await hideVehicleServiceTypeAction(
                    workspaceId,
                    vehicleId,
                    template.serviceType,
                  );
                });
              }}
            />
          );
        })}
        {custom.map((service) => {
          const payment = paymentByServiceId.get(service.id);
          const logoSrc = blobProxyUrl(service.vendor?.logoUrl);
          return (
            <Link
              key={service.id}
              href={vehicleServicePath(vehicleId, service.id)}
              className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/40"
            >
              <div className="flex items-center gap-3">
                {logoSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoSrc}
                    alt=""
                    className="size-14 shrink-0 rounded-xl bg-white object-contain p-1"
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{service.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {service.vendor?.displayName ?? "Vlastná služba"}
                  </p>
                  {payment ? (
                    <p className="mt-2 text-sm font-medium">
                      {formatMoney(toNumber(payment.amount), currency)}
                    </p>
                  ) : null}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function ServiceCard({
  template,
  configured,
  payment,
  currency,
  workspaceId,
  moduleId,
  vehicleId,
  pending,
  onHide,
}: {
  template: VehicleServiceTemplate;
  configured?: ServiceItem;
  payment?: { amount: string; title: string };
  currency: string;
  workspaceId: string;
  moduleId: string;
  vehicleId: string;
  pending: boolean;
  onHide: () => void;
}) {
  const Icon = template.icon;

  if (configured) {
    const provider =
      configured.vendor?.displayName ??
      (typeof configured.attributes?.provider === "string"
        ? configured.attributes.provider
        : null);
    const logoSrc = blobProxyUrl(configured.vendor?.logoUrl);
    return (
      <div className="relative rounded-xl border border-border bg-card p-4">
        <Link
          href={vehicleServicePath(vehicleId, configured.id)}
          className="block"
        >
          <div className="flex items-center gap-3">
            {logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoSrc}
                alt=""
                className="size-14 shrink-0 rounded-xl bg-white object-contain p-1"
              />
            ) : (
              <div className="flex size-14 items-center justify-center rounded-xl bg-muted">
                <Icon className="size-6" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{template.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {provider || configured.name}
              </p>
              {payment ? (
                <p className="mt-2 text-sm font-medium">
                  {formatMoney(toNumber(payment.amount), currency)}
                </p>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  Bez priradenej platby
                </p>
              )}
            </div>
          </div>
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-14 items-center justify-center rounded-xl bg-muted">
          <Icon className="size-6 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{template.label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Nenastavené</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <ConfigureVehicleServiceSheet
              workspaceId={workspaceId}
              moduleId={moduleId}
              vehicleId={vehicleId}
              serviceType={template.serviceType}
              defaultName={template.label}
              trigger={
                <Button size="sm" variant="outline">
                  Nastaviť
                </Button>
              }
            />
            <Button
              size="sm"
              variant="ghost"
              className="gap-1"
              disabled={pending}
              onClick={onHide}
            >
              <EyeOff className="size-3.5" />
              Skryť
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
