import { EmptyState } from "@/components/empty-state";
import { EventList } from "@/components/events/event-list";
import { AddEventSheet } from "@/components/modules/add-event-sheet";
import { PageHeader } from "@/components/page-header";
import { getAllWorkspaceEvents } from "@/lib/queries";
import { getActiveWorkspace } from "@/lib/workspace";

export default async function CalendarPage() {
  const { workspace } = await getActiveWorkspace();
  if (!workspace) return null;

  const events = await getAllWorkspaceEvents(workspace.id);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Termíny"
        description="Všetky termíny a udalosti rodiny"
        action={<AddEventSheet workspaceId={workspace.id} />}
      />

      {events.length === 0 ? (
        <EmptyState
          title="Žiadne termíny"
          description="Pridajte dôležité dátumy, pripomienky alebo udalosti."
        />
      ) : (
        <EventList items={events} workspaceId={workspace.id} />
      )}
    </div>
  );
}
