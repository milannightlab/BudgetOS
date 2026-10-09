import { notFound } from "next/navigation";
import { ServiceDetail } from "@/components/properties/service-detail";
import {
  getItemById,
  getItemDocuments,
  getItemEvents,
  getItemPayments,
  getParentPropertyId,
  getWorkspaceCategories,
} from "@/lib/queries";
import { getActiveWorkspace } from "@/lib/workspace";

export default async function PropertyServiceDetailPage({
  params,
}: {
  params: Promise<{ propertyId: string; serviceId: string }>;
}) {
  const { propertyId, serviceId } = await params;
  const { workspace } = await getActiveWorkspace();
  if (!workspace) return null;

  const [property, service] = await Promise.all([
    getItemById(workspace.id, propertyId),
    getItemById(workspace.id, serviceId),
  ]);

  if (!property || property.type !== "property") notFound();
  if (
    !service ||
    (service.type !== "property_service" && service.type !== "household_service")
  ) {
    notFound();
  }

  const parentId = await getParentPropertyId(workspace.id, service.id);
  if (parentId !== property.id) notFound();

  const [payments, events, docs, categories] = await Promise.all([
    getItemPayments(workspace.id, service.id),
    getItemEvents(workspace.id, service.id),
    getItemDocuments(workspace.id, service.id),
    getWorkspaceCategories(workspace.id),
  ]);

  return (
    <ServiceDetail
      workspaceId={workspace.id}
      currency={workspace.currency}
      service={service}
      parentPropertyId={property.id}
      parentPropertyName={property.name}
      payments={payments}
      events={events}
      docs={docs}
      categories={categories}
    />
  );
}
