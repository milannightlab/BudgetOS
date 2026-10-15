import { notFound } from "next/navigation";
import { VehicleDetail } from "@/components/vehicles/vehicle-detail";
import {
  getItemById,
  getVehicleServices,
  getVehicleSubtreeDocuments,
  getVehicleSubtreeEvents,
  getVehicleSubtreePayments,
  getWorkspaceCategories,
} from "@/lib/queries";
import { getActiveWorkspace } from "@/lib/workspace";

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ vehicleId: string }>;
}) {
  const { vehicleId } = await params;
  const { workspace } = await getActiveWorkspace();
  if (!workspace) return null;

  const vehicle = await getItemById(workspace.id, vehicleId);
  if (!vehicle || vehicle.type !== "vehicle") notFound();

  const [services, payments, events, docs, categories] = await Promise.all([
    getVehicleServices(workspace.id, vehicle.id),
    getVehicleSubtreePayments(workspace.id, vehicle.id),
    getVehicleSubtreeEvents(workspace.id, vehicle.id),
    getVehicleSubtreeDocuments(workspace.id, vehicle.id),
    getWorkspaceCategories(workspace.id),
  ]);

  return (
    <VehicleDetail
      workspaceId={workspace.id}
      currency={workspace.currency}
      vehicle={vehicle}
      services={services}
      payments={payments}
      events={events}
      docs={docs}
      categories={categories}
    />
  );
}
