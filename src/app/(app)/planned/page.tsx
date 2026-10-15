import { AddRecurringSheet } from "@/components/add-recurring-sheet";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { RecurringList } from "@/components/recurring-list";
import { TransactionList } from "@/components/transaction-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { currentYearMonth } from "@/lib/dates";
import {
  getMonthTransactions,
  getRecurring,
  getWorkspaceCategories,
} from "@/lib/queries";
import { getActiveWorkspace } from "@/lib/workspace";

export default async function PlannedPage() {
  const { workspace } = await getActiveWorkspace();
  if (!workspace) return null;

  const { year, month } = currentYearMonth();
  const [planned, recurring, categories] = await Promise.all([
    getMonthTransactions(workspace.id, year, month, "planned"),
    getRecurring(workspace.id),
    getWorkspaceCategories(workspace.id),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Plánované"
        description="Opakované platby a plánované výdavky"
        action={
          <AddRecurringSheet
            workspaceId={workspace.id}
            categories={categories}
          />
        }
      />

      <Tabs defaultValue="upcoming">
        <TabsList className="w-full">
          <TabsTrigger value="upcoming" className="flex-1">
            Tento mesiac
          </TabsTrigger>
          <TabsTrigger value="recurring" className="flex-1">
            Opakované
          </TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="mt-4">
          {planned.length === 0 ? (
            <EmptyState
              title="Žiadne plánované položky"
              description="Vytvorte opakovanú platbu alebo pridajte plánovanú transakciu."
            />
          ) : (
            <TransactionList
              items={planned.map((row) => ({
                id: row.id,
                title: row.title,
                amount: String(row.amount),
                type: row.type,
                status: row.status,
                date: row.date,
                note: row.note,
                categoryId: row.categoryId,
                itemId: row.itemId,
                recurringPaymentId: row.recurringPaymentId,
                recurringFrequency: row.recurringPayment?.frequency ?? null,
                recurringEndDate: row.recurringPayment?.endDate ?? null,
                category: row.category,
              }))}
              workspaceId={workspace.id}
              currency={workspace.currency}
              categories={categories.map((c) => ({ id: c.id, name: c.name }))}
            />
          )}
        </TabsContent>
        <TabsContent value="recurring" className="mt-4">
          {recurring.length === 0 ? (
            <EmptyState
              title="Žiadne opakované platby"
              description="Napríklad nájom, energie alebo predplatné."
            />
          ) : (
            <RecurringList
              items={recurring}
              workspaceId={workspace.id}
              currency={workspace.currency}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
