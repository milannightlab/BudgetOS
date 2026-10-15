import { notFound } from "next/navigation";
import { PropertyDetail } from "@/components/properties/property-detail";
import {
  getItemById,
  getItemSubtreeDocuments,
  getItemSubtreeEvents,
  getItemSubtreePayments,
  getPropertyServices,
  getPropertySubtreeItemIds,
  getTransactionItemPickerGroups,
  getUpcomingAgenda,
  getWorkspaceCategories,
} from "@/lib/queries";
import { getActiveWorkspace } from "@/lib/workspace";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = await params;
  const { workspace } = await getActiveWorkspace();
  if (!workspace) return null;

  const property = await getItemById(workspace.id, propertyId);
  if (!property || property.type !== "property") notFound();

  const itemIds = await getPropertySubtreeItemIds(workspace.id, property.id);

  const [services, payments, events, docs, categories, itemPickerGroups, agenda] =
    await Promise.all([
      getPropertyServices(workspace.id, property.id),
      getItemSubtreePayments(workspace.id, property.id),
      getItemSubtreeEvents(workspace.id, property.id),
      getItemSubtreeDocuments(workspace.id, property.id),
      getWorkspaceCategories(workspace.id),
      getTransactionItemPickerGroups(workspace.id, {
        filterModuleId: property.moduleId,
      }),
      getUpcomingAgenda(workspace.id, null, null, itemIds),
    ]);

  return (
    <PropertyDetail
      workspaceId={workspace.id}
      currency={workspace.currency}
      property={property}
      services={services}
      payments={payments}
      events={events}
      docs={docs}
      categories={categories}
      itemPickerGroups={itemPickerGroups}
      agenda={agenda}
    />
  );
}
