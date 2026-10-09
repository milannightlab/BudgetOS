import { DocumentList } from "@/components/documents/document-list";
import { PlannedChart } from "@/components/dashboard/planned-chart";
import { EmptyState } from "@/components/empty-state";
import { EventList } from "@/components/events/event-list";
import { AddDocumentSheet } from "@/components/modules/add-document-sheet";
import { AddEventSheet } from "@/components/modules/add-event-sheet";
import { PageHeader } from "@/components/page-header";
import { TransactionList } from "@/components/transaction-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney, toNumber } from "@/lib/money";
import {
  getPlannedPaymentsChartData,
  getPlannedPaymentsNextDays,
  getRecentDocuments,
  getUpcomingEvents,
} from "@/lib/queries";
import { getActiveWorkspace } from "@/lib/workspace";

export default async function DashboardPage() {
  const { workspace } = await getActiveWorkspace();
  if (!workspace) return null;

  const [planned, chartData, events, docs] = await Promise.all([
    getPlannedPaymentsNextDays(workspace.id, 30),
    getPlannedPaymentsChartData(workspace.id, 30),
    getUpcomingEvents(workspace.id, 8),
    getRecentDocuments(workspace.id, 6),
  ]);

  const plannedTotal = planned
    .filter((p) => p.type === "expense")
    .reduce((sum, p) => sum + toNumber(p.amount), 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Prehľad"
        description={`${workspace.name} · najbližších 30 dní`}
        action={
          <div className="flex gap-2">
            <AddEventSheet workspaceId={workspace.id} />
            <AddDocumentSheet workspaceId={workspace.id} events={events} />
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Plánované výdavky (30 dní)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {formatMoney(plannedTotal, workspace.currency)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Termíny / dokumenty
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {events.length} · {docs.length}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plánované platby — graf</CardTitle>
        </CardHeader>
        <CardContent>
          <PlannedChart data={chartData} />
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Plánované platby (30 dní)</h2>
        {planned.length === 0 ? (
          <EmptyState
            title="Žiadne plánované platby"
            description="Plánované transakcie a opakované platby sa tu zobrazia automaticky."
          />
        ) : (
          <TransactionList
            items={planned}
            workspaceId={workspace.id}
            currency={workspace.currency}
          />
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Dôležité termíny</h2>
          <AddEventSheet workspaceId={workspace.id} />
        </div>
        {events.length === 0 ? (
          <EmptyState
            title="Žiadne termíny"
            description="Pridajte STK, splatnosti alebo rodinné udalosti."
          />
        ) : (
          <EventList items={events} workspaceId={workspace.id} />
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Nahraté dokumenty</h2>
          <AddDocumentSheet workspaceId={workspace.id} events={events} />
        </div>
        {docs.length === 0 ? (
          <EmptyState
            title="Žiadne dokumenty"
            description="Zmluvy, faktúry a iné súbory môžete nahrať sem alebo v module."
          />
        ) : (
          <DocumentList items={docs} workspaceId={workspace.id} />
        )}
      </section>
    </div>
  );
}
