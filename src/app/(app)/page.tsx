import Link from "next/link";
import { AddTransactionSheet } from "@/components/add-transaction-sheet";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { TransactionList } from "@/components/transaction-list";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { currentYearMonth } from "@/lib/dates";
import { formatMoney, monthLabel } from "@/lib/money";
import {
  getBudgetProgress,
  getMonthSummary,
  getUpcomingPlanned,
  getWorkspaceCategories,
} from "@/lib/queries";
import { getActiveWorkspace } from "@/lib/workspace";

export default async function DashboardPage() {
  const { workspace } = await getActiveWorkspace();
  if (!workspace) return null;

  const { year, month } = currentYearMonth();
  const [summary, budgets, upcoming, categories] = await Promise.all([
    getMonthSummary(workspace.id, year, month),
    getBudgetProgress(workspace.id, year, month),
    getUpcomingPlanned(workspace.id, 5),
    getWorkspaceCategories(workspace.id),
  ]);

  const activeBudgets = budgets.filter((b) => b.limit > 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Prehľad"
        description={`${workspace.name} · ${monthLabel(year, month)}`}
        action={
          <AddTransactionSheet
            workspaceId={workspace.id}
            categories={categories}
          />
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Príjmy
            </CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold text-emerald-600">
            {formatMoney(summary.income, workspace.currency)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Výdavky
            </CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">
            {formatMoney(summary.expense, workspace.currency)}
          </CardContent>
        </Card>
        <Card className="col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Zostatok
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {formatMoney(summary.balance, workspace.currency)}
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Rozpočty</h2>
          <Link href="/budgets" className="text-xs text-primary hover:underline">
            Upraviť
          </Link>
        </div>
        {activeBudgets.length === 0 ? (
          <EmptyState
            title="Zatiaľ žiadne limity"
            description="Nastavte mesačné rozpočty podľa kategórií."
            action={
              <Link href="/budgets" className="text-sm text-primary underline">
                Prejsť na rozpočty
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {activeBudgets.slice(0, 4).map((item) => (
              <Card key={item.category.id}>
                <CardContent className="space-y-2 pt-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: item.category.color }}
                      />
                      <p className="text-sm font-medium">{item.category.name}</p>
                      {item.over ? (
                        <Badge variant="destructive">Prekročené</Badge>
                      ) : null}
                    </div>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {formatMoney(item.spent, workspace.currency)} /{" "}
                      {formatMoney(item.limit, workspace.currency)}
                    </p>
                  </div>
                  <Progress value={item.percent} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Najbližšie plánované</h2>
          <Link href="/planned" className="text-xs text-primary hover:underline">
            Zobraziť všetko
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <EmptyState
            title="Žiadne plánované platby"
            description="Pridajte plánovanú transakciu alebo opakovanú platbu."
          />
        ) : (
          <TransactionList
            items={upcoming}
            workspaceId={workspace.id}
            currency={workspace.currency}
          />
        )}
      </section>
    </div>
  );
}
