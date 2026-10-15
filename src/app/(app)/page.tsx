import { OverviewSchedule } from "@/components/dashboard/overview-schedule";
import { AddDocumentSheet } from "@/components/modules/add-document-sheet";
import { AddEventSheet } from "@/components/modules/add-event-sheet";
import { PageHeader } from "@/components/page-header";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { sk } from "date-fns/locale";
import {
  getPaymentTimelineData,
  getTransactionItemPickerGroups,
  getUpcomingAgenda,
  getUpcomingEvents,
  getWorkspaceCategories,
} from "@/lib/queries";
import { getActiveWorkspace } from "@/lib/workspace";

export default async function DashboardPage() {
  const { workspace } = await getActiveWorkspace();
  if (!workspace) return null;

  const monthStart = startOfMonth(new Date());
  const timelineFrom = format(monthStart, "yyyy-MM-dd");
  const timelineTo = format(endOfMonth(monthStart), "yyyy-MM-dd");
  const periodLabel = format(monthStart, "LLLL yyyy", { locale: sk });

  const [timeline, agenda, events, categories, itemPickerGroups] =
    await Promise.all([
      getPaymentTimelineData(workspace.id, timelineFrom, timelineTo),
      getUpcomingAgenda(workspace.id, timelineFrom, timelineTo),
      getUpcomingEvents(workspace.id, 8),
      getWorkspaceCategories(workspace.id),
      getTransactionItemPickerGroups(workspace.id),
    ]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Prehľad"
        description={`${workspace.name} · platby a termíny domácnosti`}
        action={
          <div className="flex gap-2">
            <AddEventSheet workspaceId={workspace.id} />
            <AddDocumentSheet workspaceId={workspace.id} events={events} />
          </div>
        }
      />

      <OverviewSchedule
        workspaceId={workspace.id}
        currency={workspace.currency}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        itemPickerGroups={itemPickerGroups}
        initialPayments={timeline.payments}
        initialEvents={timeline.events}
        initialAgenda={agenda}
        initialFrom={timelineFrom}
        initialTo={timelineTo}
        initialPeriodLabel={periodLabel}
      />
    </div>
  );
}
