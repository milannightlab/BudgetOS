import { notFound } from "next/navigation";
import { VehicleServiceDetail } from "@/components/vehicles/vehicle-service-detail";
import {
  getItemById,
  getItemDocuments,
  getItemEvents,
  getItemPayments,
  getParentItemId,
  getWorkspaceCategories,
} from "@/lib/queries";
import { getActiveWorkspace } from "@/lib/workspace";

export default async function VehicleServiceDetailPage({
  params,
}: {
  params: Promise<{ vehicleId: string; serviceId: string }>;
}) {
  const { vehicleId, serviceId } = await params;
  const { workspace } = await getActiveWorkspace();
  if (!workspace) return null;

  const [vehicle, service] = await Promise.all([
    getItemById(workspace.id, vehicleId),
    getItemById(workspace.id, serviceId),
  ]);

  if (!vehicle || vehicle.type !== "vehicle") notFound();
  if (!service || service.type !== "vehicle_service") notFound();

  const parentId = await getParentItemId(workspace.id, service.id);
  if (parentId !== vehicle.id) notFound();

  const [payments, events, docs, categories] = await Promise.all([
    getItemPayments(workspace.id, service.id),
    getItemEvents(workspace.id, service.id),
    getItemDocuments(workspace.id, service.id),
    getWorkspaceCategories(workspace.id),
  ]);

  return (
    <VehicleServiceDetail
      workspaceId={workspace.id}
      currency={workspace.currency}
      service={service}
      parentVehicleId={vehicle.id}
      parentVehicleName={vehicle.name}
      payments={payments}
      events={events}
      docs={docs}
      categories={categories}
    />
  );
}
