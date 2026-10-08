import { BudgetForm } from "@/components/budget-form";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { currentYearMonth } from "@/lib/dates";
import { formatMoney, monthLabel } from "@/lib/money";
import { getBudgetProgress, getWorkspaceCategories } from "@/lib/queries";
import { getActiveWorkspace } from "@/lib/workspace";

export default async function BudgetsPage() {
  const { workspace } = await getActiveWorkspace();
  if (!workspace) return null;

  const { year, month } = currentYearMonth();
  const [progress, categories] = await Promise.all([
    getBudgetProgress(workspace.id, year, month),
    getWorkspaceCategories(workspace.id),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Rozpočty"
        description={`Limity pre ${monthLabel(year, month)}`}
      />

      <Card>
        <CardContent className="space-y-3 pt-4">
          <p className="text-sm font-medium">Nastaviť / upraviť limit</p>
          <BudgetForm
            workspaceId={workspace.id}
            categories={categories}
            year={year}
            month={month}
          />
        </CardContent>
      </Card>

      {progress.every((p) => p.limit === 0) ? (
        <EmptyState
          title="Zatiaľ bez rozpočtov"
          description="Pridajte mesačný limit pre kategóriu vyššie."
        />
      ) : (
        <div className="space-y-3">
          {progress.map((item) => (
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
                    {formatMoney(item.spent, workspace.currency)}
                    {item.limit > 0
                      ? ` / ${formatMoney(item.limit, workspace.currency)}`
                      : " · bez limitu"}
                  </p>
                </div>
                {item.limit > 0 ? <Progress value={item.percent} /> : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
