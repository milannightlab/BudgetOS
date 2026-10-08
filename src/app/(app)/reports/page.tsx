import { CategoryChart } from "@/components/category-chart";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { currentYearMonth } from "@/lib/dates";
import { formatMoney, monthLabel } from "@/lib/money";
import {
  getCategoryBreakdown,
  getMonthSummary,
  getPlannedVsActual,
} from "@/lib/queries";
import { getActiveWorkspace } from "@/lib/workspace";

export default async function ReportsPage() {
  const { workspace } = await getActiveWorkspace();
  if (!workspace) return null;

  const { year, month } = currentYearMonth();
  const [summary, breakdown, plannedVsActual] = await Promise.all([
    getMonthSummary(workspace.id, year, month),
    getCategoryBreakdown(workspace.id, year, month),
    getPlannedVsActual(workspace.id, year, month),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reporty"
        description={monthLabel(year, month)}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">
              Skutočné výdavky
            </CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">
            {formatMoney(plannedVsActual.actual, workspace.currency)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">
              Plánované výdavky
            </CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">
            {formatMoney(plannedVsActual.planned, workspace.currency)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">
              Zostatok mesiaca
            </CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">
            {formatMoney(summary.balance, workspace.currency)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Výdavky podľa kategórií</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryChart data={breakdown} />
        </CardContent>
      </Card>

      {breakdown.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {breakdown.map((row) => (
              <div
                key={row.categoryId}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: row.categoryColor }}
                  />
                  {row.categoryName}
                </div>
                <span className="tabular-nums font-medium">
                  {formatMoney(row.total, workspace.currency)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
