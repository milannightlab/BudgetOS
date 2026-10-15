"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Banknote,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { sk } from "date-fns/locale";
import { deleteEventAction, setEventCompletedAction } from "@/actions/events";
import {
  deleteTransactionAction,
  setTransactionStatusAction,
} from "@/actions/transactions";
import { EditTransactionSheet } from "@/components/edit-transaction-sheet";
import { EmptyState } from "@/components/empty-state";
import { FormSheetContent } from "@/components/form-sheet-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TransactionItemOptionGroup } from "@/lib/transaction-item-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { AgendaDisplayItem, UpcomingAgendaItem } from "@/lib/agenda-types";
import { DEFAULT_ITEM_COLOR } from "@/lib/item-color";
import { formatMoney, toNumber } from "@/lib/money";
import { cn } from "@/lib/utils";
import { getServiceTemplate } from "@/modules/property-services";
import { getModuleBySlug } from "@/modules/registry";
import { getVehicleServiceTemplate } from "@/modules/vehicle-services";

type KindFilter = "all" | "payment" | "event";

function formatAgendaDate(date: string) {
  return format(parseISO(date), "d. M. yyyy", { locale: sk });
}

function itemCountLabel(count: number) {
  if (count === 1) return "1 položka";
  if (count >= 2 && count <= 4) return `${count} položky`;
  return `${count} položiek`;
}

function KindBadge({ kind }: { kind: UpcomingAgendaItem["kind"] }) {
  if (kind === "payment") {
    return (
      <Badge
        variant="secondary"
        className="gap-1 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
      >
        <Banknote className="size-3" aria-hidden />
        Platba
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="gap-1">
      <CalendarDays className="size-3" aria-hidden />
      Termín
    </Badge>
  );
}

function agendaCategoryIcon(
  item: AgendaDisplayItem | null,
  kind: UpcomingAgendaItem["kind"],
): LucideIcon {
  if (item?.categoryKey) {
    const fromService =
      getServiceTemplate(item.categoryKey)?.icon ??
      getVehicleServiceTemplate(item.categoryKey)?.icon;
    if (fromService) return fromService;
  }
  if (item?.moduleSlug) {
    const fromModule = getModuleBySlug(item.moduleSlug)?.icon;
    if (fromModule) return fromModule;
  }
  return kind === "event" ? CalendarDays : Banknote;
}

function AgendaVendorMark({
  item,
  kind,
}: {
  item: AgendaDisplayItem | null;
  kind: UpcomingAgendaItem["kind"];
}) {
  if (item?.vendorLogoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.vendorLogoUrl}
        alt=""
        className="mt-0.5 size-7 shrink-0 rounded-md border border-border bg-white object-contain p-0.5"
      />
    );
  }

  const Icon = agendaCategoryIcon(item, kind);
  return (
    <div
      className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-muted"
      aria-hidden
    >
      <Icon className="size-3.5 text-muted-foreground" />
    </div>
  );
}

function StatusToggle({
  done,
  disabled,
  onToggle,
}: {
  done: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-label={done ? "Označiť ako nesplnené" : "Označiť ako splnené"}
      aria-pressed={done}
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors",
        done
          ? "border-emerald-700 bg-emerald-700 text-white"
          : "border-muted-foreground/35 bg-background text-muted-foreground/50 hover:border-muted-foreground/60 hover:text-muted-foreground",
        disabled && "opacity-50",
      )}
    >
      <Check className="size-3.5" strokeWidth={2.5} aria-hidden />
    </button>
  );
}

function resolveDeleteScope(isSeries: boolean) {
  if (!window.confirm("Naozaj chcete zmazať túto položku?")) return null;
  if (!isSeries) return "single" as const;
  const future = window.confirm(
    "Zmazať aj všetky budúce plánované platby v tejto sérii?",
  );
  return future ? ("future" as const) : ("single" as const);
}

export function UpcomingAgenda({
  workspaceId,
  items,
  currency,
  categories = [],
  itemPickerGroups = [],
  periodLabel,
  loading = false,
  pageSize,
  title = "Čo ťa čaká",
  emptyTitle,
  emptyDescription,
  onChanged,
}: {
  workspaceId: string;
  items: UpcomingAgendaItem[];
  currency: string;
  categories?: { id: string; name: string }[];
  itemPickerGroups?: TransactionItemOptionGroup[];
  periodLabel?: string;
  loading?: boolean;
  /** When set, shows at most this many rows with prev/next controls. */
  pageSize?: number;
  title?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  onChanged?: () => void;
}) {
  const [rows, setRows] = useState(() =>
    Array.isArray(items) ? items : [],
  );
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [itemFilter, setItemFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editPaymentId, setEditPaymentId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setRows(Array.isArray(items) ? items : []);
  }, [items]);

  useEffect(() => {
    setPage(0);
  }, [kindFilter, itemFilter]);

  const itemOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of rows) {
      if (row.item) map.set(row.item.id, row.item.name);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "sk"));
  }, [rows]);

  const kindCounts = useMemo(
    () => ({
      all: rows.length,
      payment: rows.filter((row) => row.kind === "payment").length,
      event: rows.filter((row) => row.kind === "event").length,
    }),
    [rows],
  );

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (kindFilter !== "all" && row.kind !== kindFilter) return false;
      if (itemFilter !== "all" && row.item?.id !== itemFilter) return false;
      return true;
    });
  }, [rows, kindFilter, itemFilter]);

  useEffect(() => {
    if (!pageSize) return;
    const maxPage = Math.max(0, Math.ceil(filtered.length / pageSize) - 1);
    if (page > maxPage) setPage(maxPage);
  }, [filtered.length, page, pageSize]);

  const pageCount = pageSize
    ? Math.max(1, Math.ceil(filtered.length / pageSize))
    : 1;
  const safePage = Math.min(page, pageCount - 1);
  const paged = pageSize
    ? filtered.slice(safePage * pageSize, safePage * pageSize + pageSize)
    : filtered;
  const rangeStart = filtered.length === 0 ? 0 : safePage * (pageSize ?? 0) + 1;
  const rangeEnd = pageSize
    ? Math.min(filtered.length, (safePage + 1) * pageSize)
    : filtered.length;

  const selected = selectedId
    ? (rows.find((row) => row.id === selectedId) ?? null)
    : null;

  function setRowStatus(row: UpcomingAgendaItem, next: "open" | "done") {
    setRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, status: next } : r)),
    );

    startTransition(async () => {
      try {
        if (row.kind === "payment") {
          await setTransactionStatusAction(
            row.entityId,
            workspaceId,
            next === "done" ? "actual" : "planned",
          );
        } else {
          await setEventCompletedAction(
            row.entityId,
            workspaceId,
            next === "done",
          );
        }
      } catch (err) {
        console.error("Agenda status update failed", err);
        setRows(items);
      }
    });
  }

  function toggleRow(row: UpcomingAgendaItem) {
    setRowStatus(row, row.status === "done" ? "open" : "done");
  }

  function removeRow(row: UpcomingAgendaItem) {
    const scope =
      row.kind === "payment"
        ? resolveDeleteScope(Boolean(row.recurringPaymentId))
        : window.confirm("Naozaj chcete zmazať túto položku?")
          ? ("single" as const)
          : null;
    if (!scope) return;

    setRows((prev) => prev.filter((r) => r.id !== row.id));
    if (selectedId === row.id) setSelectedId(null);

    startTransition(async () => {
      try {
        if (row.kind === "payment") {
          await deleteTransactionAction(row.entityId, workspaceId, scope);
        } else {
          await deleteEventAction(row.entityId, workspaceId);
        }
        onChanged?.();
      } catch (err) {
        console.error("Agenda delete failed", err);
        setRows(items);
      }
    });
  }

  const editingPayment = editPaymentId
    ? (rows.find(
        (row) => row.kind === "payment" && row.entityId === editPaymentId,
      ) ?? null)
    : null;

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {periodLabel ? (
          <p className="text-xs capitalize text-muted-foreground">
            {periodLabel}
          </p>
        ) : null}
      </div>

      <div
        className={cn(
          "overflow-hidden rounded-xl border border-border bg-card",
          loading && "opacity-70",
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-muted/60 p-1">
            {(
              [
                { key: "all", label: "Všetko", count: kindCounts.all },
                { key: "payment", label: "Platby", count: kindCounts.payment },
                { key: "event", label: "Termíny", count: kindCounts.event },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setKindFilter(tab.key)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  kindFilter === tab.key
                    ? "bg-background text-emerald-800 shadow-sm dark:text-emerald-300"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}{" "}
                <span className="tabular-nums text-muted-foreground">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Položka</span>
            <Select value={itemFilter} onValueChange={setItemFilter}>
              <SelectTrigger size="sm" className="min-w-36">
                <SelectValue placeholder="Všetky" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všetky</SelectItem>
                {itemOptions.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading && rows.length === 0 ? (
          <p className="px-4 py-8 text-sm text-muted-foreground">Načítavam…</p>
        ) : filtered.length === 0 ? (
          <div className="px-2 py-4">
            <EmptyState
              title={emptyTitle ?? "Nič v tomto období"}
              description={
                emptyDescription ??
                "Plánované platby a termíny sa tu zobrazia podľa vybranej časovej osi."
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] table-fixed text-left text-sm">
              <colgroup>
                <col className="w-10" />
                <col className="w-[9.5rem]" />
                <col className="w-[11.5rem]" />
                <col className="w-[16rem]" />
                <col />
                <col className="w-[7rem]" />
                <col className="w-10" />
              </colgroup>
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-3 py-2 font-medium" />
                  <th className="px-2 py-2 font-medium">Typ</th>
                  <th className="px-2 py-2 font-medium">Kedy</th>
                  <th className="px-2 py-2 font-medium">Položka</th>
                  <th className="px-2 py-2 font-medium">Popis</th>
                  <th className="px-2 py-2 text-right font-medium">Suma</th>
                  <th className="px-2 py-2 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paged.map((row) => {
                  const done = row.status === "done";
                  return (
                    <tr
                      key={row.id}
                      className="cursor-pointer transition-colors hover:bg-muted/40"
                      onClick={() => setSelectedId(row.id)}
                    >
                      <td className="px-3 py-3 align-middle">
                        <StatusToggle
                          done={done}
                          disabled={pending}
                          onToggle={() => toggleRow(row)}
                        />
                      </td>
                      <td className="max-w-0 overflow-hidden px-2 py-3 align-middle">
                        <div className="flex min-w-0 flex-col items-start gap-1">
                          <KindBadge kind={row.kind} />
                          {row.recurringPaymentId ? (
                            <Badge variant="outline" className="text-[10px]">
                              Opakovaná
                            </Badge>
                          ) : null}
                        </div>
                      </td>
                      <td className="max-w-0 overflow-hidden px-2 py-3 align-middle">
                        <p
                          className={cn(
                            "truncate font-medium tabular-nums",
                            done && "text-muted-foreground line-through",
                          )}
                        >
                          {formatAgendaDate(row.date)}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {row.kind === "payment"
                            ? "Dátum splatnosti"
                            : "Dátum termínu"}
                        </p>
                      </td>
                      <td className="max-w-0 overflow-hidden px-2 py-3 align-middle">
                        {row.item ? (
                          <div className="flex min-w-0 items-start gap-2">
                            <span
                              className="mt-1 size-2.5 shrink-0 rounded-full"
                              style={{
                                backgroundColor:
                                  row.item.color ?? DEFAULT_ITEM_COLOR,
                              }}
                              aria-hidden
                            />
                            <div className="min-w-0">
                              <p
                                className={cn(
                                  "truncate font-medium",
                                  done && "text-muted-foreground line-through",
                                )}
                                title={row.item.name}
                              >
                                {row.item.name}
                              </p>
                              {row.item.moduleLabel ? (
                                <p
                                  className="truncate text-xs text-muted-foreground"
                                  title={row.item.moduleLabel}
                                >
                                  {row.item.moduleLabel}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        ) : (
                          <p className="text-muted-foreground">—</p>
                        )}
                      </td>
                      <td className="px-2 py-3 align-middle">
                        <div className="flex items-start gap-2">
                          <AgendaVendorMark item={row.item} kind={row.kind} />
                          <div className="min-w-0">
                            <p
                              className={cn(
                                "font-medium",
                                done && "text-muted-foreground line-through",
                              )}
                            >
                              {row.title}
                            </p>
                            {row.description ? (
                              <p className="text-xs text-muted-foreground">
                                {row.description}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-3 text-right align-middle tabular-nums">
                        {row.amount != null && row.amountType ? (
                          <span
                            className={cn(
                              "font-semibold",
                              done && "text-muted-foreground line-through",
                              !done &&
                                row.amountType === "income" &&
                                "text-emerald-700",
                            )}
                          >
                            {row.amountType === "income" ? "+" : ""}
                            {formatMoney(toNumber(row.amount), currency)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-2 py-3 align-middle">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="text-muted-foreground"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="size-4" />
                              <span className="sr-only">Viac možností</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="min-w-44"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <DropdownMenuItem
                              disabled={pending}
                              onSelect={() => toggleRow(row)}
                            >
                              {done
                                ? row.kind === "payment"
                                  ? "Označiť ako plánovanú"
                                  : "Označiť ako nesplnené"
                                : row.kind === "payment"
                                  ? "Označiť ako zaplatené"
                                  : "Označiť ako splnené"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setSelectedId(row.id)}>
                              Otvoriť detail
                            </DropdownMenuItem>
                            {row.kind === "payment" && categories.length > 0 ? (
                              <DropdownMenuItem
                                onSelect={() => setEditPaymentId(row.entityId)}
                              >
                                Upraviť
                              </DropdownMenuItem>
                            ) : null}
                            {row.href ? (
                              <DropdownMenuItem asChild>
                                <Link href={row.href}>Prejsť na položku</Link>
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              disabled={pending}
                              onSelect={() => removeRow(row)}
                            >
                              Zmazať
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2.5 text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5">
            <Check className="size-3.5 shrink-0" aria-hidden />
            Stlačením fajfky označíte položku ako splnenú.
          </p>
          {pageSize && filtered.length > 0 ? (
            <div className="flex items-center gap-2">
              <p className="tabular-nums">
                {rangeStart}–{rangeEnd} z {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  disabled={safePage <= 0}
                  onClick={() => setPage((p) => Math.max(0, Math.min(p, pageCount - 1) - 1))}
                  aria-label="Predchádzajúca strana"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  disabled={safePage >= pageCount - 1}
                  onClick={() =>
                    setPage((p) => Math.min(pageCount - 1, Math.min(p, pageCount - 1) + 1))
                  }
                  aria-label="Ďalšia strana"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          ) : (
            <p className="tabular-nums">{itemCountLabel(filtered.length)}</p>
          )}
        </div>
      </div>

      <Sheet
        open={selected != null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      >
        <FormSheetContent>
          {selected ? (
            <>
              <SheetHeader>
                <SheetTitle className="pr-8">{selected.title}</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 px-4 pb-6">
                <div className="flex flex-wrap items-center gap-2">
                  <KindBadge kind={selected.kind} />
                  <Badge variant={selected.status === "done" ? "outline" : "secondary"}>
                    {selected.kind === "payment"
                      ? selected.status === "done"
                        ? "Uhradená"
                        : "Plánovaná"
                      : selected.status === "done"
                        ? "Splnené"
                        : "Otvorené"}
                  </Badge>
                  {selected.recurringPaymentId ? (
                    <Badge variant="outline">Opakovaná</Badge>
                  ) : null}
                </div>

                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      {selected.kind === "payment"
                        ? "Dátum splatnosti"
                        : "Dátum termínu"}
                    </dt>
                    <dd className="mt-0.5 font-medium tabular-nums">
                      {formatAgendaDate(selected.date)}
                    </dd>
                  </div>
                  {selected.amount != null && selected.amountType ? (
                    <div>
                      <dt className="text-xs text-muted-foreground">Suma</dt>
                      <dd
                        className={cn(
                          "mt-0.5 font-semibold tabular-nums",
                          selected.amountType === "income" && "text-emerald-700",
                        )}
                      >
                        {selected.amountType === "income" ? "+" : ""}
                        {formatMoney(toNumber(selected.amount), currency)}
                      </dd>
                    </div>
                  ) : null}
                  {selected.item ? (
                    <div>
                      <dt className="text-xs text-muted-foreground">Položka</dt>
                      <dd className="mt-0.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="size-2.5 shrink-0 rounded-full"
                            style={{
                              backgroundColor:
                                selected.item.color ?? DEFAULT_ITEM_COLOR,
                            }}
                            aria-hidden
                          />
                          <p className="font-medium">{selected.item.name}</p>
                        </div>
                        {selected.item.moduleLabel ? (
                          <p className="text-xs text-muted-foreground">
                            {selected.item.moduleLabel}
                          </p>
                        ) : null}
                        {selected.href ? (
                          <Link
                            href={selected.href}
                            className="mt-1 inline-block text-xs text-primary hover:underline"
                          >
                            Otvoriť položku
                          </Link>
                        ) : null}
                      </dd>
                    </div>
                  ) : null}
                  {selected.categoryName ? (
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        {selected.kind === "payment" ? "Kategória" : "Typ"}
                      </dt>
                      <dd className="mt-0.5 font-medium">
                        {selected.categoryName}
                      </dd>
                    </div>
                  ) : null}
                  {selected.note ? (
                    <div>
                      <dt className="text-xs text-muted-foreground">Poznámka</dt>
                      <dd className="mt-0.5 whitespace-pre-wrap">
                        {selected.note}
                      </dd>
                    </div>
                  ) : null}
                </dl>

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    type="button"
                    disabled={pending}
                    onClick={() => toggleRow(selected)}
                  >
                    {selected.status === "done"
                      ? selected.kind === "payment"
                        ? "Označiť ako plánovanú"
                        : "Označiť ako nesplnené"
                      : selected.kind === "payment"
                        ? "Zaplatené"
                        : "Splnené"}
                  </Button>
                  {selected.kind === "payment" && categories.length > 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={pending}
                      onClick={() => {
                        setEditPaymentId(selected.entityId);
                        setSelectedId(null);
                      }}
                    >
                      Upraviť
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending}
                    onClick={() => removeRow(selected)}
                  >
                    Zmazať
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </FormSheetContent>
      </Sheet>

      <EditTransactionSheet
        open={editingPayment != null}
        onOpenChange={(open) => {
          if (!open) setEditPaymentId(null);
        }}
        workspaceId={workspaceId}
        categories={categories}
        itemPickerGroups={itemPickerGroups}
        transaction={
          editingPayment
            ? {
                id: editingPayment.entityId,
                title: editingPayment.title,
                amount: editingPayment.amount ?? undefined,
                type: editingPayment.amountType ?? "expense",
                status: editingPayment.status === "done" ? "actual" : "planned",
                date: editingPayment.date,
                note: editingPayment.note,
                categoryId: editingPayment.categoryId ?? undefined,
                itemId: editingPayment.itemId,
                recurringPaymentId: editingPayment.recurringPaymentId,
                frequency: editingPayment.recurringFrequency,
                endDate: editingPayment.recurringEndDate,
              }
            : null
        }
        onSuccess={() => {
          setEditPaymentId(null);
          onChanged?.();
        }}
      />
    </section>
  );
}
