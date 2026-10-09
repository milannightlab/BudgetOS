import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AddTransactionSheet } from "@/components/add-transaction-sheet";
import { ArchiveItemButton } from "@/components/items/archive-item-button";
import { EditItemSheet } from "@/components/items/edit-item-sheet";
import { ItemRelationsPanel } from "@/components/items/item-relations";
import { DocumentList } from "@/components/documents/document-list";
import { EmptyState } from "@/components/empty-state";
import { EventList } from "@/components/events/event-list";
import { AddDocumentSheet } from "@/components/modules/add-document-sheet";
import { AddEventSheet } from "@/components/modules/add-event-sheet";
import { PageHeader } from "@/components/page-header";
import { TransactionList } from "@/components/transaction-list";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  getItemById,
  getItemDocuments,
  getItemEvents,
  getItemPayments,
  getItemRelations,
  getParentPropertyId,
  getWorkspaceCategories,
  getWorkspaceItemsForSelect,
  getWorkspaceMembers,
} from "@/lib/queries";
import {
  propertyPath,
  propertyServicePath,
} from "@/lib/property-paths";
import { getActiveWorkspace } from "@/lib/workspace";
import {
  getItemTypeDefinition,
  type ItemFieldDefinition,
} from "@/modules/item-types";
import { getModuleBySlug, isModuleSlug } from "@/modules/registry";

const STATUS_LABEL = {
  active: "Aktívna",
  inactive: "Neaktívna",
  archived: "Archivovaná",
} as const;

function formatAttributeValue(
  field: ItemFieldDefinition,
  value: unknown,
): string {
  if (value === null || value === undefined || value === "") return "—";
  if (field.input === "select" && field.options) {
    return (
      field.options.find((o) => o.value === String(value))?.label ??
      String(value)
    );
  }
  return String(value);
}

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { workspace } = await getActiveWorkspace();
  if (!workspace) return null;

  const item = await getItemById(workspace.id, id);
  if (!item) notFound();

  // Redirect before any Položky UI / extra fetches — avoids nav flash.
  if (item.type === "property") {
    redirect(propertyPath(item.id));
  }
  if (item.type === "property_service" || item.type === "household_service") {
    const parentPropertyId = await getParentPropertyId(workspace.id, item.id);
    if (parentPropertyId) {
      redirect(propertyServicePath(parentPropertyId, item.id));
    }
  }

  const moduleSlug = item.module.slug;
  if (!isModuleSlug(moduleSlug)) notFound();

  const moduleDef = getModuleBySlug(moduleSlug);
  const typeDef = getItemTypeDefinition(moduleSlug, item.type);

  const [categories, payments, events, docs, relations, members, allItems] =
    await Promise.all([
      getWorkspaceCategories(workspace.id),
      getItemPayments(workspace.id, item.id),
      getItemEvents(workspace.id, item.id),
      getItemDocuments(workspace.id, item.id),
      getItemRelations(workspace.id, item.id),
      getWorkspaceMembers(workspace.id),
      getWorkspaceItemsForSelect(workspace.id),
    ]);

  const memberOptions = members.map((m) => ({
    userId: m.userId,
    name: m.user.name,
  }));

  const relatedIds = new Set(
    relations.flatMap((r) => [r.sourceItemId, r.targetItemId]),
  );
  const candidates = allItems.filter(
    (i) => i.id !== item.id && !relatedIds.has(i.id),
  );

  const attributes = (item.attributes ?? {}) as Record<string, unknown>;

  return (
    <div className="space-y-5">
      <Link
        href={`/modules/${moduleSlug}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Späť do {moduleDef?.label ?? "modulu"}
      </Link>

      <PageHeader
        title={item.name}
        description={item.description ?? undefined}
        action={
          <div className="flex flex-wrap justify-end gap-2">
            <EditItemSheet
              workspaceId={workspace.id}
              moduleId={item.moduleId}
              moduleSlug={moduleSlug}
              members={memberOptions}
              item={item}
            />
            {item.status !== "archived" ? (
              <ArchiveItemButton
                itemId={item.id}
                workspaceId={workspace.id}
                moduleSlug={moduleSlug}
              />
            ) : null}
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{moduleDef?.label ?? moduleSlug}</Badge>
        <Badge variant="outline">{typeDef?.label ?? item.type}</Badge>
        <Badge variant="outline">{STATUS_LABEL[item.status]}</Badge>
        {item.assignedMember ? (
          <Badge variant="outline">{item.assignedMember.name}</Badge>
        ) : null}
      </div>

      {typeDef && typeDef.fields.length > 0 ? (
        <Card>
          <CardContent className="grid gap-3 pt-4 sm:grid-cols-2">
            {typeDef.fields.map((field) => (
              <div key={field.key}>
                <p className="text-xs text-muted-foreground">{field.label}</p>
                <p className="text-sm font-medium">
                  {formatAttributeValue(field, attributes[field.key])}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Platby</h2>
          <AddTransactionSheet
            workspaceId={workspace.id}
            categories={categories}
            moduleId={item.moduleId}
            itemId={item.id}
            label="Platba"
            variant="outline"
          />
        </div>
        {payments.length === 0 ? (
          <EmptyState
            title="Žiadne platby"
            description="Pridajte platbu viazanú na túto položku."
          />
        ) : (
          <TransactionList
            items={payments}
            workspaceId={workspace.id}
            currency={workspace.currency}
          />
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Termíny</h2>
          <AddEventSheet
            workspaceId={workspace.id}
            moduleId={item.moduleId}
            itemId={item.id}
          />
        </div>
        {events.length === 0 ? (
          <EmptyState
            title="Žiadne termíny"
            description="Pridajte termín viazaný na túto položku."
          />
        ) : (
          <EventList items={events} workspaceId={workspace.id} />
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Dokumenty</h2>
          <AddDocumentSheet
            workspaceId={workspace.id}
            moduleId={item.moduleId}
            itemId={item.id}
            events={events}
          />
        </div>
        {docs.length === 0 ? (
          <EmptyState
            title="Žiadne dokumenty"
            description="Nahrajte dokumenty viazané na túto položku."
          />
        ) : (
          <DocumentList items={docs} workspaceId={workspace.id} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Súvisiace položky</h2>
        <ItemRelationsPanel
          workspaceId={workspace.id}
          itemId={item.id}
          relations={relations}
          candidates={candidates}
        />
      </section>
    </div>
  );
}
