import { notFound } from "next/navigation";
import { VehiclesOverview } from "@/components/vehicles/vehicles-overview";
import { getModuleBySlugForWorkspace } from "@/lib/modules";
import {
  getModuleItems,
  getVehicleCardSummaries,
} from "@/lib/queries";
import { getActiveWorkspace } from "@/lib/workspace";

export default async function TransportModulePage() {
  const { workspace } = await getActiveWorkspace();
  if (!workspace) return null;

  const moduleRow = await getModuleBySlugForWorkspace(workspace.id, "transport");
  if (!moduleRow || !moduleRow.enabled) notFound();

  const vehicles = (
    await getModuleItems(workspace.id, moduleRow.id, { type: "vehicle" })
  ).filter((v) => v.status !== "archived");
  const summaryMap = await getVehicleCardSummaries(
    workspace.id,
    vehicles.map((v) => v.id),
  );
  const summaries = Object.fromEntries(summaryMap.entries());

  return (
    <VehiclesOverview
      workspaceId={workspace.id}
      moduleId={moduleRow.id}
      vehicles={vehicles}
      summaries={summaries}
    />
  );
}
