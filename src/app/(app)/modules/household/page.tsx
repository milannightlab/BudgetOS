import { notFound } from "next/navigation";
import { PropertiesOverview } from "@/components/properties/properties-overview";
import { getModuleBySlugForWorkspace } from "@/lib/modules";
import {
  getModuleItems,
  getPropertyCardSummaries,
} from "@/lib/queries";
import { getActiveWorkspace } from "@/lib/workspace";

export default async function HouseholdModulePage() {
  const { workspace } = await getActiveWorkspace();
  if (!workspace) return null;

  const moduleRow = await getModuleBySlugForWorkspace(workspace.id, "household");
  if (!moduleRow || !moduleRow.enabled) notFound();

  const properties = (
    await getModuleItems(workspace.id, moduleRow.id, { type: "property" })
  ).filter((p) => p.status !== "archived");
  const summaryMap = await getPropertyCardSummaries(
    workspace.id,
    properties.map((p) => p.id),
  );
  const summaries = Object.fromEntries(summaryMap.entries());

  return (
    <PropertiesOverview
      workspaceId={workspace.id}
      moduleId={moduleRow.id}
      properties={properties}
      summaries={summaries}
    />
  );
}
