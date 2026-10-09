import Link from "next/link";
import { AddTransactionSheet } from "@/components/add-transaction-sheet";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { TransactionList } from "@/components/transaction-list";
import { currentYearMonth } from "@/lib/dates";
import { monthLabel } from "@/lib/money";
import {
  getMonthTransactions,
  getWorkspaceCategories,
} from "@/lib/queries";
import { getActiveWorkspace } from "@/lib/workspace";
import { cn } from "@/lib/utils";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string }>;
}) {
  const { workspace } = await getActiveWorkspace();
  if (!workspace) return null;

  const params = await searchParams;
  const { year, month } = currentYearMonth();
  const [rows, categories] = await Promise.all([
    getMonthTransactions(workspace.id, year, month),
    getWorkspaceCategories(workspace.id),
  ]);

  const filtered = rows.filter((row) => {
    if (params.type && row.type !== params.type) return false;
    if (params.status && row.status !== params.status) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Platby"
        description={monthLabel(year, month)}
        action={
          <AddTransactionSheet
            workspaceId={workspace.id}
            categories={categories}
          />
        }
      />

      <div className="flex flex-wrap gap-2 text-sm">
        <FilterChip href="/transactions" active={!params.type && !params.status}>
          Všetko
        </FilterChip>
        <FilterChip
          href="/transactions?type=expense"
          active={params.type === "expense"}
        >
          Výdavky
        </FilterChip>
        <FilterChip
          href="/transactions?type=income"
          active={params.type === "income"}
        >
          Príjmy
        </FilterChip>
        <FilterChip
          href="/transactions?status=planned"
          active={params.status === "planned"}
        >
          Plánované
        </FilterChip>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Žiadne transakcie"
          description="Pridajte prvý výdavok alebo príjem pre tento mesiac."
        />
      ) : (
        <TransactionList
          items={filtered}
          workspaceId={workspace.id}
          currency={workspace.currency}
        />
      )}
    </div>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full px-3 py-1",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}
