import { notFound, redirect } from "next/navigation";
import { AddTransactionSheet } from "@/components/add-transaction-sheet";
import { AddItemSheet } from "@/components/items/add-item-sheet";
import { ItemsSection } from "@/components/items/items-section";
import { DocumentList } from "@/components/documents/document-list";
import { EmptyState } from "@/components/empty-state";
import { EventList } from "@/components/events/event-list";
import { AddDocumentSheet } from "@/components/modules/add-document-sheet";
import { AddEventSheet } from "@/components/modules/add-event-sheet";
import { PageHeader } from "@/components/page-header";
import { TransactionList } from "@/components/transaction-list";
import { getModuleBySlugForWorkspace } from "@/lib/modules";
import { propertiesModulePath } from "@/lib/property-paths";
import {
  getModuleDocuments,
  getModuleEvents,
  getModuleItems,
  getModulePayments,
  getWorkspaceCategories,
  getWorkspaceMembers,
} from "@/lib/queries";
import { getActiveWorkspace } from "@/lib/workspace";
import { getModuleBySlug, isModuleSlug } from "@/modules/registry";

export default async function ModulePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isModuleSlug(slug)) notFound();
  // Dedicated tree under modules/household/* — never render generic Položky UI.
  if (slug === "household") redirect(propertiesModulePath());

  const definition = getModuleBySlug(slug);
  if (!definition) notFound();

  const { workspace } = await getActiveWorkspace();
  if (!workspace) return null;

  const moduleRow = await getModuleBySlugForWorkspace(workspace.id, slug);
  if (!moduleRow || !moduleRow.enabled) notFound();

  const [events, docs, payments, categories, moduleItems, members] =
    await Promise.all([
      getModuleEvents(workspace.id, moduleRow.id),
      getModuleDocuments(workspace.id, moduleRow.id),
      getModulePayments(workspace.id, moduleRow.id),
      getWorkspaceCategories(workspace.id),
      getModuleItems(workspace.id, moduleRow.id),
      getWorkspaceMembers(workspace.id),
    ]);

  const memberOptions = members.map((m) => ({
    userId: m.userId,
    name: m.user.name,
  }));

  const Icon = definition.icon;

  return (
    <div className="space-y-5">
      <PageHeader
        title={definition.label}
        description={definition.description}
        action={
          <AddItemSheet
            workspaceId={workspace.id}
            moduleId={moduleRow.id}
            moduleSlug={slug}
            members={memberOptions}
            label="Vytvoriť položku"
          />
        }
      />

      <div className="flex items-start gap-3">
        <div
          className="flex size-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${definition.color}22` }}
        >
          <Icon className="size-5" style={{ color: definition.color }} />
        </div>
        <p className="text-sm text-muted-foreground">{definition.description}</p>
      </div>

      {moduleItems.length === 0 ? (
        <EmptyState
          title={`Začnite s modulom ${definition.label}`}
          description={`${definition.description}. Vytvorte prvú položku a priraďte k nej platby, termíny alebo dokumenty.`}
          action={
            <AddItemSheet
              workspaceId={workspace.id}
              moduleId={moduleRow.id}
              moduleSlug={slug}
              members={memberOptions}
              label="Vytvoriť položku"
            />
          }
        />
      ) : (
        <ItemsSection
          workspaceId={workspace.id}
          moduleId={moduleRow.id}
          moduleSlug={slug}
          members={memberOptions}
          items={moduleItems}
        />
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Platby</h2>
          <AddTransactionSheet
            workspaceId={workspace.id}
            categories={categories}
            moduleId={moduleRow.id}
            label="Platba"
            variant="outline"
          />
        </div>
        {payments.length === 0 ? (
          <EmptyState
            title="Žiadne platby v module"
            description="Pridajte výdavok alebo príjem súvisiaci s týmto modulom."
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
            moduleId={moduleRow.id}
          />
        </div>
        {events.length === 0 ? (
          <EmptyState
            title="Žiadne termíny v module"
            description="Pridajte dôležité dátumy súvisiace s týmto modulom."
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
            moduleId={moduleRow.id}
            events={events}
          />
        </div>
        {docs.length === 0 ? (
          <EmptyState
            title="Žiadne dokumenty"
            description="Nahrajte zmluvy, potvrdenia alebo iné súbory."
          />
        ) : (
          <DocumentList items={docs} workspaceId={workspace.id} />
        )}
      </section>
    </div>
  );
}
