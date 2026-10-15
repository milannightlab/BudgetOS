"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  addDays,
  addMonths,
  addYears,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  differenceInCalendarYears,
  eachDayOfInterval,
  eachMonthOfInterval,
  eachYearOfInterval,
  endOfDecade,
  endOfMonth,
  endOfYear,
  format,
  isMonday,
  isSameMonth,
  isSameYear,
  isSaturday,
  isToday,
  isWeekend,
  parseISO,
  startOfDay,
  startOfDecade,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
  subYears,
} from "date-fns";
import { sk } from "date-fns/locale";
import { Check, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { loadPaymentTimelineAction } from "@/actions/timeline";
import { AddTransactionSheet } from "@/components/add-transaction-sheet";
import { AddEventSheet } from "@/components/modules/add-event-sheet";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { DEFAULT_ITEM_COLOR } from "@/lib/item-color";
import { formatMoney, toNumber } from "@/lib/money";
import type { TransactionItemOptionGroup } from "@/lib/transaction-item-picker";
import type {
  TimelineEvent,
  TimelinePayment,
  TimelinePeriodData,
} from "@/lib/timeline-types";

export type TimelineRange = "day" | "month" | "year";

const RANGE_OPTIONS: { value: TimelineRange; label: string }[] = [
  { value: "day", label: "Deň" },
  { value: "month", label: "Mesiac" },
  { value: "year", label: "Rok" },
];

const EVENT_DOT: Record<TimelineEvent["type"], string> = {
  deadline: "bg-amber-500",
  event: "bg-sky-500",
  reminder: "bg-violet-500",
};

function TimelineAxisLabel({
  primary,
  secondary,
}: {
  primary: string;
  secondary?: string;
}) {
  return (
    <span className="pointer-events-none absolute top-0.5 left-1.5 z-[3] rounded-md bg-background/90 px-1.5 py-1 shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-border/70 backdrop-blur-[3px]">
      <span className="block text-[10px] font-semibold leading-none tracking-tight text-foreground/85 capitalize">
        {primary}
      </span>
      {secondary ? (
        <span className="mt-0.5 block text-[9px] font-medium leading-none tabular-nums text-muted-foreground">
          {secondary}
        </span>
      ) : null}
    </span>
  );
}

/** Round chart scale + horizontal tick amounts (e.g. 50 / 100 / 150). */
function nicePriceScale(
  maxValue: number,
  desiredTicks = 3,
): { scaleMax: number; ticks: number[] } {
  const max = Math.max(maxValue, 1);
  const rough = max / desiredTicks;
  const power = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / power;
  const niceNorm =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  const step = niceNorm * power;
  const scaleMax = Math.max(step, Math.ceil(max / step) * step);
  const ticks: number[] = [];
  for (let value = step; value <= scaleMax + step * 1e-9; value += step) {
    ticks.push(Number(value.toPrecision(12)));
  }
  return { scaleMax, ticks };
}

function formatAxisMoney(amount: number, currency: string) {
  const abs = Math.abs(amount);
  return new Intl.NumberFormat("sk-SK", {
    style: "currency",
    currency,
    notation: abs >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: abs >= 100 ? 0 : abs >= 10 ? 1 : 2,
    minimumFractionDigits: 0,
  }).format(abs);
}

function TimelinePriceAxis({
  ticks,
  scaleMax,
  barMaxHeight,
  currency,
}: {
  ticks: number[];
  scaleMax: number;
  barMaxHeight: number;
  currency: string;
}) {
  return (
    <div
      className="relative w-11 shrink-0 self-stretch border-r border-border/70 bg-white"
      aria-hidden
    >
      <div className="relative mt-3" style={{ height: barMaxHeight }}>
        {ticks.map((tick) => (
          <span
            key={tick}
            className="absolute right-1.5 text-[9px] font-medium tabular-nums leading-none text-muted-foreground"
            style={{
              top: `${((scaleMax - tick) / scaleMax) * 100}%`,
              transform: "translateY(-50%)",
            }}
          >
            {formatAxisMoney(tick, currency)}
          </span>
        ))}
      </div>
    </div>
  );
}

function TimelinePriceLines({
  ticks,
  scaleMax,
  barMaxHeight,
}: {
  ticks: number[];
  scaleMax: number;
  barMaxHeight: number;
}) {
  // Align with chart `pt-3` (12px) + bar column height.
  return (
    <div
      className="pointer-events-none absolute right-0 left-0 z-0"
      style={{ top: 12, height: barMaxHeight }}
      aria-hidden
    >
      {ticks.map((tick) => (
        <div
          key={tick}
          className="absolute right-0 left-0 border-t border-dashed border-border/55"
          style={{
            top: `${((scaleMax - tick) / scaleMax) * 100}%`,
          }}
        />
      ))}
      <div className="absolute right-0 bottom-0 left-0 border-t border-border/80" />
    </div>
  );
}

function periodKey(from: string, to: string) {
  return `${from}_${to}`;
}

function windowBounds(anchor: Date, range: TimelineRange) {
  if (range === "day") {
    return { start: startOfMonth(anchor), end: endOfMonth(anchor) };
  }
  if (range === "month") {
    return { start: startOfYear(anchor), end: endOfYear(anchor) };
  }
  return { start: startOfDecade(anchor), end: endOfDecade(anchor) };
}

function boundsKey(anchor: Date, range: TimelineRange) {
  const { start, end } = windowBounds(anchor, range);
  const from = format(start, "yyyy-MM-dd");
  const to = format(end, "yyyy-MM-dd");
  return { from, to, key: periodKey(from, to), start, end };
}

function shiftAnchor(anchor: Date, range: TimelineRange, direction: -1 | 1) {
  if (range === "day") return addMonths(anchor, direction);
  if (range === "month") return addYears(anchor, direction);
  return addYears(anchor, direction * 10);
}

function periodLabel(anchor: Date, range: TimelineRange) {
  if (range === "day") {
    return format(anchor, "LLLL yyyy", { locale: sk });
  }
  if (range === "month") {
    return format(anchor, "yyyy");
  }
  const decadeStart = startOfDecade(anchor);
  return `${format(decadeStart, "yyyy")} – ${format(endOfDecade(anchor), "yyyy")}`;
}

function snapAnchor(date: Date, range: TimelineRange) {
  if (range === "day") return startOfMonth(date);
  if (range === "month") return startOfYear(date);
  return startOfDecade(date);
}

type TimelineHeaderInfo = {
  label: string;
  from: string;
  to: string;
  expenseTotal: number;
  eventCount: number;
  loading: boolean;
};

type TimelineControls = {
  scrollByPage: (direction: -1 | 1) => void;
  scrollToToday: () => void;
};

function headerBoundsForDay(day: Date): Pick<TimelineHeaderInfo, "from" | "to" | "label"> {
  const start = startOfMonth(day);
  const end = endOfMonth(day);
  return {
    label: format(day, "LLLL yyyy", { locale: sk }),
    from: format(start, "yyyy-MM-dd"),
    to: format(end, "yyyy-MM-dd"),
  };
}

function headerBoundsForMonth(
  month: Date,
): Pick<TimelineHeaderInfo, "from" | "to" | "label"> {
  const start = startOfYear(month);
  const end = endOfYear(month);
  return {
    label: format(month, "yyyy"),
    from: format(start, "yyyy-MM-dd"),
    to: format(end, "yyyy-MM-dd"),
  };
}

function headerBoundsForYear(
  year: Date,
): Pick<TimelineHeaderInfo, "from" | "to" | "label"> {
  const start = startOfDecade(year);
  const end = endOfDecade(year);
  return {
    label: periodLabel(year, "year"),
    from: format(start, "yyyy-MM-dd"),
    to: format(end, "yyyy-MM-dd"),
  };
}

export function PaymentTimeline({
  workspaceId,
  categories = [],
  itemPickerGroups = [],
  initialPayments,
  initialEvents,
  currency,
  propertyId,
  onPeriodChange,
  onCreated,
  dataRevision = 0,
}: {
  workspaceId: string;
  categories?: { id: string; name: string }[];
  itemPickerGroups?: TransactionItemOptionGroup[];
  initialPayments: TimelinePayment[];
  initialEvents: TimelineEvent[];
  currency: string;
  propertyId?: string;
  onPeriodChange?: (period: {
    from: string;
    to: string;
    label: string;
  }) => void;
  onCreated?: () => void;
  /** Bump to clear cache and reload visible timeline data (e.g. after agenda status change). */
  dataRevision?: number;
}) {
  const [range, setRange] = useState<TimelineRange>("day");
  const [anchor, setAnchor] = useState(() => startOfMonth(new Date()));
  const [dayFocusDate, setDayFocusDate] = useState(() => new Date());
  const [monthFocusDate, setMonthFocusDate] = useState(() =>
    startOfMonth(new Date()),
  );
  const [yearFocusDate, setYearFocusDate] = useState(() =>
    startOfYear(new Date()),
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [createPaymentDate, setCreatePaymentDate] = useState<string | null>(
    null,
  );
  const [createEventDate, setCreateEventDate] = useState<string | null>(null);
  const [reloadSignal, setReloadSignal] = useState(0);
  const [dayHeader, setDayHeader] = useState<TimelineHeaderInfo>(() => ({
    ...headerBoundsForDay(new Date()),
    expenseTotal: 0,
    eventCount: 0,
    loading: false,
  }));
  const [monthHeader, setMonthHeader] = useState<TimelineHeaderInfo>(() => ({
    ...headerBoundsForMonth(new Date()),
    expenseTotal: 0,
    eventCount: 0,
    loading: false,
  }));
  const [yearHeader, setYearHeader] = useState<TimelineHeaderInfo>(() => ({
    ...headerBoundsForYear(new Date()),
    expenseTotal: 0,
    eventCount: 0,
    loading: false,
  }));
  const dayScrollerRef = useRef<HTMLDivElement>(null);
  const monthScrollerRef = useRef<HTMLDivElement>(null);
  const yearScrollerRef = useRef<HTMLDivElement>(null);
  const dayControlsRef = useRef<TimelineControls | null>(null);
  const monthControlsRef = useRef<TimelineControls | null>(null);
  const yearControlsRef = useRef<TimelineControls | null>(null);
  const inflightRef = useRef(new Map<string, Promise<TimelinePeriodData>>());
  const cacheRef = useRef<Map<string, TimelinePeriodData> | null>(null);

  if (cacheRef.current === null) {
    const seed = boundsKey(startOfMonth(new Date()), "day");
    cacheRef.current = new Map([
      [seed.key, { payments: initialPayments, events: initialEvents }],
    ]);
  }

  const fetchPeriod = useCallback(
    async (from: string, to: string) => {
      const key = periodKey(from, to);
      const cached = cacheRef.current?.get(key);
      if (cached) return cached;

      const existing = inflightRef.current.get(key);
      if (existing) return existing;

      const promise = (async () => {
        try {
          const data = await loadPaymentTimelineAction({
            workspaceId,
            fromDate: from,
            toDate: to,
            propertyId,
          });
          const entry: TimelinePeriodData = {
            payments: data.payments,
            events: data.events,
          };
          cacheRef.current?.set(key, entry);
          return entry;
        } finally {
          inflightRef.current.delete(key);
        }
      })();

      inflightRef.current.set(key, promise);
      return promise;
    },
    [workspaceId, propertyId],
  );

  const handleCreated = useCallback(() => {
    cacheRef.current?.clear();
    inflightRef.current.clear();
    setReloadSignal((n) => n + 1);
    onCreated?.();
  }, [onCreated]);

  useEffect(() => {
    if (dataRevision <= 0) return;
    cacheRef.current?.clear();
    inflightRef.current.clear();
    setReloadSignal((n) => n + 1);
  }, [dataRevision]);

  const prefetchNeighbors = useCallback(
    (currentAnchor: Date, currentRange: TimelineRange) => {
      const prev = boundsKey(
        shiftAnchor(currentAnchor, currentRange, -1),
        currentRange,
      );
      const next = boundsKey(
        shiftAnchor(currentAnchor, currentRange, 1),
        currentRange,
      );
      void fetchPeriod(prev.from, prev.to).catch(() => undefined);
      void fetchPeriod(next.from, next.to).catch(() => undefined);
    },
    [fetchPeriod],
  );

  // Prefetch neighbors for the initial month after mount.
  useEffect(() => {
    prefetchNeighbors(anchor, range);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  function changeRange(next: TimelineRange) {
    setSelectedDate(null);

    if (next === "day") {
      setDayFocusDate(new Date());
      setRange("day");
      setAnchor(startOfMonth(new Date()));
      return;
    }
    if (next === "month") {
      setMonthFocusDate(startOfMonth(new Date()));
      setRange("month");
      setAnchor(startOfYear(new Date()));
      return;
    }
    setYearFocusDate(startOfYear(new Date()));
    setRange("year");
    setAnchor(startOfDecade(new Date()));
  }

  const headerLabel =
    range === "day"
      ? dayHeader.label
      : range === "month"
        ? monthHeader.label
        : yearHeader.label;
  const headerExpense =
    range === "day"
      ? dayHeader.expenseTotal
      : range === "month"
        ? monthHeader.expenseTotal
        : yearHeader.expenseTotal;
  const headerEvents =
    range === "day"
      ? dayHeader.eventCount
      : range === "month"
        ? monthHeader.eventCount
        : yearHeader.eventCount;
  const headerLoading =
    range === "day"
      ? dayHeader.loading
      : range === "month"
        ? monthHeader.loading
        : yearHeader.loading;

  const activePeriod =
    range === "day"
      ? dayHeader
      : range === "month"
        ? monthHeader
        : yearHeader;

  useEffect(() => {
    onPeriodChange?.({
      from: activePeriod.from,
      to: activePeriod.to,
      label: activePeriod.label,
    });
  }, [
    activePeriod.from,
    activePeriod.to,
    activePeriod.label,
    onPeriodChange,
  ]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold tracking-tight">
          Časová os platieb a termínov
        </h2>
        <div className="inline-flex shrink-0 rounded-lg bg-muted p-0.5">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => changeRange(opt.value)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                range === opt.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex w-full items-center justify-between gap-2">
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          aria-label="Predchádzajúce obdobie"
          onClick={() => {
            if (range === "day") dayControlsRef.current?.scrollByPage(-1);
            else if (range === "month")
              monthControlsRef.current?.scrollByPage(-1);
            else yearControlsRef.current?.scrollByPage(-1);
          }}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <div className="min-w-0 flex-1 text-center">
          <p className="text-sm font-semibold capitalize">{headerLabel}</p>
          <p className="text-[11px] text-muted-foreground">
            {headerLoading ? (
              "Načítavam…"
            ) : (
              <>
                {formatMoney(headerExpense, currency)}
                {headerEvents > 0 ? ` · ${headerEvents} termínov` : null}
              </>
            )}
          </p>
        </div>
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          aria-label="Nasledujúce obdobie"
          onClick={() => {
            if (range === "day") dayControlsRef.current?.scrollByPage(1);
            else if (range === "month")
              monthControlsRef.current?.scrollByPage(1);
            else yearControlsRef.current?.scrollByPage(1);
          }}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {range === "day" ? (
        <ContinuousDayTimeline
          key={format(dayFocusDate, "yyyy-MM-dd")}
          focusDate={dayFocusDate}
          currency={currency}
          initialPayments={initialPayments}
          initialEvents={initialEvents}
          fetchPeriod={fetchPeriod}
          selectedDate={selectedDate}
          onSelectDay={(date) => setSelectedDate(date)}
          onHeaderChange={setDayHeader}
          controlsRef={dayControlsRef}
          scrollerRef={dayScrollerRef}
          reloadSignal={reloadSignal}
          onCreatePayment={(date) => setCreatePaymentDate(date)}
          onCreateEvent={(date) => setCreateEventDate(date)}
        />
      ) : null}

      {range === "month" ? (
        <ContinuousMonthTimeline
          key={format(monthFocusDate, "yyyy-MM")}
          focusDate={monthFocusDate}
          currency={currency}
          initialPayments={initialPayments}
          initialEvents={initialEvents}
          fetchPeriod={fetchPeriod}
          selectedMonthKey={selectedDate ? selectedDate.slice(0, 7) : null}
          onOpenMonth={(monthStart) => {
            setSelectedDate(null);
            setDayFocusDate(startOfMonth(monthStart));
            setRange("day");
          }}
          onHeaderChange={setMonthHeader}
          controlsRef={monthControlsRef}
          scrollerRef={monthScrollerRef}
        />
      ) : null}

      {range === "year" ? (
        <ContinuousYearTimeline
          key={format(yearFocusDate, "yyyy")}
          focusDate={yearFocusDate}
          currency={currency}
          initialPayments={initialPayments}
          initialEvents={initialEvents}
          fetchPeriod={fetchPeriod}
          selectedYearKey={selectedDate ? selectedDate.slice(0, 4) : null}
          onOpenYear={(yearStart) => {
            setSelectedDate(null);
            setMonthFocusDate(startOfYear(yearStart));
            setRange("month");
          }}
          onHeaderChange={setYearHeader}
          controlsRef={yearControlsRef}
          scrollerRef={yearScrollerRef}
        />
      ) : null}

      <AddTransactionSheet
        workspaceId={workspaceId}
        categories={categories}
        itemPickerGroups={itemPickerGroups}
        defaultDate={createPaymentDate ?? undefined}
        defaultStatus="planned"
        open={createPaymentDate != null}
        onOpenChange={(open) => {
          if (!open) setCreatePaymentDate(null);
        }}
        showTrigger={false}
        onSuccess={handleCreated}
      />
      <AddEventSheet
        workspaceId={workspaceId}
        defaultDate={createEventDate ?? undefined}
        open={createEventDate != null}
        onOpenChange={(open) => {
          if (!open) setCreateEventDate(null);
        }}
        showTrigger={false}
        onSuccess={handleCreated}
      />
    </section>
  );
}

const DAY_COL_WIDTH = 52;
/** Prefer fitting about a full month of day columns in the visible scroller. */
const DAY_MIN_VISIBLE = 31;
const DAY_COL_WIDTH_MIN = 18;
/** Matches `px-1` on the day columns row. */
const DAY_ROW_PAD_PX = 4;
const DAY_BAR_MAX_HEIGHT = 140;
const DAY_CHUNK = 30;
const DAY_MAX_WINDOW = 240;

function computeDayColWidth(scrollerWidth: number) {
  if (scrollerWidth <= 0) return DAY_COL_WIDTH;
  // Shrink columns on phone/tablet so ~31 days fit; never grow past desktop width.
  return Math.max(
    DAY_COL_WIDTH_MIN,
    Math.min(DAY_COL_WIDTH, scrollerWidth / DAY_MIN_VISIBLE),
  );
}

function DayCreateFab({
  onCreatePayment,
  onCreateEvent,
  onExpandedChange,
}: {
  onCreatePayment: () => void;
  onCreateEvent: () => void;
  onExpandedChange?: (expanded: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onExpandedChange?.(expanded);
  }, [expanded, onExpandedChange]);

  useEffect(() => {
    if (!expanded) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setExpanded(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [expanded]);

  return (
    <div
      ref={rootRef}
      className={cn(
        "absolute bottom-1 left-1/2 z-50 flex -translate-x-1/2 flex-col-reverse items-center gap-2",
        "pointer-events-none opacity-0 transition-opacity duration-150",
        "group-hover/day:pointer-events-auto group-hover/day:opacity-100",
        "focus-within:pointer-events-auto focus-within:opacity-100",
        expanded && "pointer-events-auto opacity-100",
      )}
    >
      <button
        type="button"
        className={cn(
          "flex size-7 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-md transition-colors",
          "hover:bg-muted",
          expanded && "border-teal-700 bg-teal-700 text-white hover:bg-teal-800",
        )}
        aria-label={expanded ? "Zavrieť možnosti" : "Pridať na tento deň"}
        aria-expanded={expanded}
        onClick={(event) => {
          event.stopPropagation();
          setExpanded((value) => !value);
        }}
      >
        <Plus
          className={cn(
            "size-3.5 transition-transform duration-150",
            expanded && "rotate-45",
          )}
          aria-hidden
        />
      </button>

      {expanded ? (
        <div
          role="menu"
          className="relative z-50 min-w-28 overflow-hidden rounded-2xl bg-foreground py-1 text-background shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center px-3.5 py-2 text-left text-xs font-semibold tracking-wide transition-colors hover:bg-background/15"
            onClick={(event) => {
              event.stopPropagation();
              setExpanded(false);
              onCreateEvent();
            }}
          >
            Udalosť
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center px-3.5 py-2 text-left text-xs font-semibold tracking-wide transition-colors hover:bg-background/15"
            onClick={(event) => {
              event.stopPropagation();
              setExpanded(false);
              onCreatePayment();
            }}
          >
            Platba
          </button>
        </div>
      ) : null}
    </div>
  );
}

function monthKeysInRange(from: Date, to: Date) {
  return eachMonthOfInterval({ start: startOfMonth(from), end: startOfMonth(to) }).map(
    (month) => format(month, "yyyy-MM"),
  );
}

function ContinuousDayTimeline({
  focusDate,
  currency,
  initialPayments,
  initialEvents,
  fetchPeriod,
  selectedDate,
  onSelectDay,
  onHeaderChange,
  controlsRef,
  scrollerRef,
  reloadSignal = 0,
  onCreatePayment,
  onCreateEvent,
}: {
  focusDate: Date;
  currency: string;
  initialPayments: TimelinePayment[];
  initialEvents: TimelineEvent[];
  fetchPeriod: (from: string, to: string) => Promise<TimelinePeriodData>;
  selectedDate: string | null;
  onSelectDay: (date: string) => void;
  onHeaderChange: (header: TimelineHeaderInfo) => void;
  controlsRef: React.MutableRefObject<{
    scrollByPage: (direction: -1 | 1) => void;
    scrollToToday: () => void;
  } | null>;
  scrollerRef: React.RefObject<HTMLDivElement | null>;
  reloadSignal?: number;
  onCreatePayment?: (date: string) => void;
  onCreateEvent?: (date: string) => void;
}) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const focusDay = useMemo(() => startOfDay(focusDate), [focusDate]);
  const [windowStart, setWindowStart] = useState(() => subDays(focusDay, 21));
  const [windowEnd, setWindowEnd] = useState(() => addDays(focusDay, 45));
  const [payments, setPayments] = useState<TimelinePayment[]>(initialPayments);
  const [events, setEvents] = useState<TimelineEvent[]>(initialEvents);
  const [loadingEdge, setLoadingEdge] = useState(false);

  const todayRef = useRef<HTMLButtonElement>(null);
  const loadedMonthsRef = useRef(new Set<string>());
  const loadingEdgeRef = useRef<"start" | "end" | null>(null);
  const prependAdjustRef = useRef(0);
  const didInitialScrollRef = useRef(false);
  const pendingMonthScrollRef = useRef<Date | null>(null);
  const focusButtonRef = useRef<HTMLButtonElement>(null);
  const [fabExpandedDate, setFabExpandedDate] = useState<string | null>(null);
  const [dayColWidth, setDayColWidth] = useState(DAY_COL_WIDTH);
  const dayColWidthRef = useRef(DAY_COL_WIDTH);

  const days = useMemo(
    () => eachDayOfInterval({ start: windowStart, end: windowEnd }),
    [windowStart, windowEnd],
  );

  const alignMonthStart = useCallback(
    (monthStart: Date, behavior: ScrollBehavior = "smooth") => {
      const root = scrollerRef.current;
      if (!root) return false;
      const key = format(monthStart, "yyyy-MM-dd");
      const index = days.findIndex(
        (day) => format(day, "yyyy-MM-dd") === key,
      );
      if (index < 0) return false;
      root.scrollTo({
        left: DAY_ROW_PAD_PX + index * dayColWidthRef.current,
        behavior,
      });
      return true;
    },
    [days, scrollerRef],
  );

  // Fit ≥31 day columns into the scroller below the desktop breakpoint.
  useLayoutEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;

    const update = () => {
      const next = computeDayColWidth(root.clientWidth);
      const prev = dayColWidthRef.current;
      if (Math.abs(prev - next) < 0.25) return;
      const ratio = next / prev;
      dayColWidthRef.current = next;
      root.scrollLeft *= ratio;
      setDayColWidth(next);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(root);
    return () => ro.disconnect();
  }, [scrollerRef]);

  const paymentsByDate = useMemo(() => {
    const map = new Map<string, TimelinePayment[]>();
    for (const p of payments) {
      const list = map.get(p.date) ?? [];
      list.push(p);
      map.set(p.date, list);
    }
    return map;
  }, [payments]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, TimelineEvent[]>();
    for (const e of events) {
      const list = map.get(e.eventDate) ?? [];
      list.push(e);
      map.set(e.eventDate, list);
    }
    return map;
  }, [events]);

  const maxDayTotal = useMemo(() => {
    let max = 0;
    for (const list of paymentsByDate.values()) {
      const total = list.reduce(
        (sum, p) => sum + Math.abs(toNumber(p.amount)),
        0,
      );
      if (total > max) max = total;
    }
    return max || 1;
  }, [paymentsByDate]);

  const { scaleMax, ticks: priceTicks } = useMemo(
    () => nicePriceScale(maxDayTotal),
    [maxDayTotal],
  );

  const mergeData = useCallback((data: TimelinePeriodData) => {
    setPayments((prev) => {
      const seen = new Set(prev.map((p) => p.id));
      const next = [...prev];
      for (const p of data.payments) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          next.push(p);
        }
      }
      return next;
    });
    setEvents((prev) => {
      const seen = new Set(prev.map((e) => e.id));
      const next = [...prev];
      for (const e of data.events) {
        if (!seen.has(e.id)) {
          seen.add(e.id);
          next.push(e);
        }
      }
      return next;
    });
  }, []);

  const ensureMonthsLoaded = useCallback(
    async (from: Date, to: Date) => {
      const keys = monthKeysInRange(from, to);
      const missing = keys.filter((key) => !loadedMonthsRef.current.has(key));
      if (missing.length === 0) return;

      for (const key of missing) {
        loadedMonthsRef.current.add(key);
      }

      setLoadingEdge(true);
      try {
        await Promise.all(
          missing.map(async (key) => {
            const month = parseISO(`${key}-01`);
            const fromDate = format(startOfMonth(month), "yyyy-MM-dd");
            const toDate = format(endOfMonth(month), "yyyy-MM-dd");
            try {
              const data = await fetchPeriod(fromDate, toDate);
              mergeData(data);
            } catch (err) {
              loadedMonthsRef.current.delete(key);
              console.error("Timeline month load failed", err);
            }
          }),
        );
      } finally {
        setLoadingEdge(false);
      }
    },
    [fetchPeriod, mergeData],
  );

  // Seed focus / current month as loaded when it matches SSR data.
  useEffect(() => {
    loadedMonthsRef.current.add(format(today, "yyyy-MM"));
    void ensureMonthsLoaded(windowStart, windowEnd);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial seed only
  }, []);

  // Reload after creating a payment/event from the day FAB.
  useEffect(() => {
    if (reloadSignal <= 0) return;
    loadedMonthsRef.current.clear();
    setPayments([]);
    setEvents([]);
    void ensureMonthsLoaded(windowStart, windowEnd);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- signal-driven reload
  }, [reloadSignal]);

  // Keep scroll stable when days are prepended / pruned.
  useLayoutEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;

    if (prependAdjustRef.current !== 0) {
      root.scrollLeft += prependAdjustRef.current;
      prependAdjustRef.current = 0;
    }

    if (pendingMonthScrollRef.current) {
      const monthStart = pendingMonthScrollRef.current;
      pendingMonthScrollRef.current = null;
      didInitialScrollRef.current = true;
      alignMonthStart(monthStart, "smooth");
      return;
    }

    if (!didInitialScrollRef.current) {
      didInitialScrollRef.current = true;
      // Prefer aligning the current month from day 1 so the whole month is visible.
      const monthStart = startOfMonth(focusDay);
      if (!alignMonthStart(monthStart, "auto")) {
        const target = todayRef.current ?? focusButtonRef.current;
        target?.scrollIntoView({
          inline: "center",
          block: "nearest",
          behavior: "auto",
        });
      }
    }
  }, [days, scrollerRef, alignMonthStart, focusDay]);

  const expandStart = useCallback(async () => {
    if (loadingEdgeRef.current) return;
    loadingEdgeRef.current = "start";

    const prevStart = windowStart;
    const nextStart = subDays(prevStart, DAY_CHUNK);
    prependAdjustRef.current += DAY_CHUNK * dayColWidthRef.current;
    setWindowStart(nextStart);

    const span = differenceInCalendarDays(windowEnd, nextStart) + 1;
    if (span > DAY_MAX_WINDOW) {
      setWindowEnd(addDays(nextStart, DAY_MAX_WINDOW - 1));
    }

    try {
      await ensureMonthsLoaded(nextStart, prevStart);
    } finally {
      requestAnimationFrame(() => {
        loadingEdgeRef.current = null;
      });
    }
  }, [windowStart, windowEnd, ensureMonthsLoaded]);

  const expandEnd = useCallback(async () => {
    if (loadingEdgeRef.current) return;
    loadingEdgeRef.current = "end";

    const prevEnd = windowEnd;
    const nextEnd = addDays(prevEnd, DAY_CHUNK);
    setWindowEnd(nextEnd);

    const span = differenceInCalendarDays(nextEnd, windowStart) + 1;
    if (span > DAY_MAX_WINDOW) {
      const pruned = span - DAY_MAX_WINDOW;
      prependAdjustRef.current -= pruned * dayColWidthRef.current;
      setWindowStart(addDays(windowStart, pruned));
    }

    try {
      await ensureMonthsLoaded(prevEnd, nextEnd);
    } finally {
      requestAnimationFrame(() => {
        loadingEdgeRef.current = null;
      });
    }
  }, [windowStart, windowEnd, ensureMonthsLoaded]);

  const updateHeaderFromScroll = useCallback(() => {
    const root = scrollerRef.current;
    if (!root || days.length === 0) return;

    const colWidth = dayColWidthRef.current;
    const centerOffset = root.scrollLeft + root.clientWidth / 2;
    const index = Math.min(
      days.length - 1,
      Math.max(0, Math.floor(centerOffset / colWidth)),
    );
    const centerDay = days[index] ?? focusDay;
    const bounds = headerBoundsForDay(centerDay);
    const monthKey = format(centerDay, "yyyy-MM");

    let expenseTotal = 0;
    let eventCount = 0;
    for (const [date, list] of paymentsByDate) {
      if (!date.startsWith(monthKey)) continue;
      for (const p of list) {
        if (p.type === "expense") expenseTotal += toNumber(p.amount);
      }
    }
    for (const [date, list] of eventsByDate) {
      if (!date.startsWith(monthKey)) continue;
      eventCount += list.length;
    }

    onHeaderChange({
      ...bounds,
      expenseTotal,
      eventCount,
      loading: loadingEdge,
    });
  }, [
    days,
    focusDay,
    paymentsByDate,
    eventsByDate,
    loadingEdge,
    onHeaderChange,
    scrollerRef,
  ]);

  useEffect(() => {
    updateHeaderFromScroll();
  }, [updateHeaderFromScroll]);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;

    let armed = false;
    const armTimer = window.setTimeout(() => {
      armed = true;
    }, 200);

    const onScroll = () => {
      updateHeaderFromScroll();
      if (!armed || loadingEdgeRef.current) return;

      const { scrollLeft, scrollWidth, clientWidth } = root;
      const maxScroll = Math.max(scrollWidth - clientWidth, 0);
      const edgePx = dayColWidthRef.current * 8;

      if (scrollLeft <= edgePx) {
        void expandStart();
      } else if (scrollLeft >= maxScroll - edgePx) {
        void expandEnd();
      }
    };

    root.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(armTimer);
      root.removeEventListener("scroll", onScroll);
    };
  }, [scrollerRef, expandStart, expandEnd, updateHeaderFromScroll]);

  useEffect(() => {
    controlsRef.current = {
      scrollByPage: (direction) => {
        const root = scrollerRef.current;
        if (!root || days.length === 0) return;

        const colWidth = dayColWidthRef.current;
        const centerOffset = root.scrollLeft + root.clientWidth / 2;
        const centerIndex = Math.min(
          days.length - 1,
          Math.max(0, Math.floor(centerOffset / colWidth)),
        );
        const centerDay = days[centerIndex] ?? focusDay;
        const targetMonth = addMonths(startOfMonth(centerDay), direction);
        const monthStart = startOfMonth(targetMonth);
        const monthEnd = endOfMonth(targetMonth);

        const covered =
          monthStart >= windowStart && monthEnd <= windowEnd;
        if (!covered) {
          const nextStart = subDays(monthStart, 21);
          const nextEnd = addDays(monthEnd, 45);
          pendingMonthScrollRef.current = monthStart;
          prependAdjustRef.current = 0;
          setWindowStart(nextStart);
          setWindowEnd(nextEnd);
          void ensureMonthsLoaded(nextStart, nextEnd);
          return;
        }

        alignMonthStart(monthStart, "smooth");
      },
      scrollToToday: () => {
        const monthStart = startOfMonth(today);
        const monthEnd = endOfMonth(today);
        if (monthStart < windowStart || monthEnd > windowEnd) {
          const nextStart = subDays(monthStart, 21);
          const nextEnd = addDays(monthEnd, 45);
          pendingMonthScrollRef.current = monthStart;
          setWindowStart(nextStart);
          setWindowEnd(nextEnd);
          prependAdjustRef.current = 0;
          void ensureMonthsLoaded(nextStart, nextEnd);
          return;
        }

        alignMonthStart(monthStart, "smooth");
      },
    };

    return () => {
      controlsRef.current = null;
    };
  }, [
    controlsRef,
    scrollerRef,
    today,
    focusDay,
    days,
    windowStart,
    windowEnd,
    ensureMonthsLoaded,
    alignMonthStart,
  ]);

  return (
    <TooltipProvider delayDuration={80}>
      <div className="flex overflow-hidden rounded-xl border border-border bg-white">
        <TimelinePriceAxis
          ticks={priceTicks}
          scaleMax={scaleMax}
          barMaxHeight={DAY_BAR_MAX_HEIGHT}
          currency={currency}
        />
        <div
          ref={scrollerRef}
          className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="relative flex w-max min-w-full items-stretch pb-2 pt-3">
            <TimelinePriceLines
              ticks={priceTicks}
              scaleMax={scaleMax}
              barMaxHeight={DAY_BAR_MAX_HEIGHT}
            />

            <div className="relative z-[1] flex px-1">
              {days.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const dayPayments = paymentsByDate.get(key) ?? [];
                const dayEvents = eventsByDate.get(key) ?? [];
                const dayTotal = dayPayments.reduce(
                  (sum, p) => sum + Math.abs(toNumber(p.amount)),
                  0,
                );
                const hasActivity =
                  dayPayments.length > 0 || dayEvents.length > 0;
                const isTodayDay = isToday(day);
                const isFocusDay =
                  format(day, "yyyy-MM-dd") === format(focusDay, "yyyy-MM-dd");
                const selected = selectedDate === key;
                const monthStart = day.getDate() === 1;
                const weekStart = isMonday(day);
                const weekend = isWeekend(day);
                const weekendStart = isSaturday(day);
                const barHeight =
                  dayTotal > 0
                    ? Math.max(
                        8,
                        Math.round((dayTotal / scaleMax) * DAY_BAR_MAX_HEIGHT),
                      )
                    : 0;
                const allPaymentsPaid =
                  dayPayments.length > 0 &&
                  dayPayments.every((payment) => payment.status === "actual");

                const fabOpen = fabExpandedDate === key;

                return (
                  <div
                    key={key}
                    className={cn(
                      "group/day relative z-0 flex shrink-0 flex-col items-center transition-colors duration-150",
                      "hover:z-50 hover:bg-teal-700/[0.08] focus-within:z-50 focus-within:bg-teal-700/[0.08]",
                      fabOpen && "z-50",
                    )}
                    style={{ width: dayColWidth }}
                  >
                    {/* Weekend tint only below bars so price grid stays visible. */}
                    {weekend ? (
                      <span
                        className="pointer-events-none absolute inset-x-0 bottom-0 bg-muted/45"
                        style={{ top: DAY_BAR_MAX_HEIGHT }}
                        aria-hidden
                      />
                    ) : null}
                    {monthStart ? (
                      <>
                        <span
                          className="pointer-events-none absolute inset-y-1 left-0 z-[2] w-px bg-foreground/30"
                          aria-hidden
                        />
                        <TimelineAxisLabel
                          primary={format(day, "LLL", { locale: sk })}
                          secondary={format(day, "yyyy")}
                        />
                      </>
                    ) : weekStart ? (
                      <span
                        className="pointer-events-none absolute inset-y-1 left-0 z-[2] w-px bg-border"
                        aria-hidden
                      />
                    ) : null}
                    {weekendStart && !monthStart && !weekStart ? (
                      <span
                        className="pointer-events-none absolute inset-y-1 left-0 z-[2] w-px bg-border/80"
                        aria-hidden
                      />
                    ) : null}
                    {isTodayDay ? (
                      <span className="pointer-events-none absolute inset-y-1 left-1/2 w-px -translate-x-1/2 bg-teal-700/25" />
                    ) : null}

                    <div
                      className="relative flex w-full flex-col items-center justify-end overflow-visible px-0.5"
                      style={{ height: DAY_BAR_MAX_HEIGHT }}
                    >
                      {dayPayments.length > 0 ? (
                        <div className="relative flex w-full flex-col items-center justify-end">
                          <div
                            className={cn(
                              "flex w-[70%] min-w-[6px] max-w-full flex-col-reverse overflow-hidden rounded-t-md shadow-sm ring-1 ring-black/5",
                              dayPayments.length > 1 &&
                                "gap-px bg-background/80",
                            )}
                            style={{ height: barHeight }}
                            role="img"
                            aria-label={`${dayPayments.length} platieb, spolu ${formatMoney(dayTotal, currency)}${allPaymentsPaid ? ", všetky uhradené" : ""}`}
                          >
                            {dayPayments.map((payment, index) => (
                              <PaymentBarSegment
                                key={payment.id}
                                payment={payment}
                                currency={currency}
                                weight={Math.abs(toNumber(payment.amount))}
                                roundedTop={index === dayPayments.length - 1}
                                roundedBottom={index === 0}
                                onSelect={() => onSelectDay(key)}
                              />
                            ))}
                          </div>
                          {allPaymentsPaid ? (
                            <span
                              className="pointer-events-none absolute -top-1 left-1/2 z-[2] flex size-3.5 -translate-x-1/2 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm ring-1 ring-white"
                              title="Všetky platby uhradené"
                              aria-hidden
                            >
                              <Check className="size-2.5" strokeWidth={3} />
                            </span>
                          ) : null}
                        </div>
                      ) : null}

                      {onCreatePayment && onCreateEvent ? (
                        <DayCreateFab
                          onCreatePayment={() => onCreatePayment(key)}
                          onCreateEvent={() => onCreateEvent(key)}
                          onExpandedChange={(expanded) => {
                            setFabExpandedDate(expanded ? key : null);
                          }}
                        />
                      ) : null}
                    </div>

                    <div className="relative z-[1] flex h-4 w-full items-center justify-center gap-0.5">
                      {dayEvents.slice(0, 3).map((ev) => (
                        <span
                          key={ev.id}
                          className={cn(
                            "size-1.5 rotate-45 rounded-[1px]",
                            EVENT_DOT[ev.type],
                          )}
                          title={ev.title}
                        />
                      ))}
                      {dayEvents.length > 3 ? (
                        <span className="text-[9px] text-muted-foreground">+</span>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      ref={(node) => {
                        if (isTodayDay) todayRef.current = node;
                        if (isFocusDay) focusButtonRef.current = node;
                      }}
                      onClick={() => hasActivity && onSelectDay(key)}
                      disabled={!hasActivity}
                      className={cn(
                        "relative z-[1] mt-0.5 flex flex-col items-center pb-1",
                        !hasActivity && "cursor-default opacity-70",
                      )}
                      aria-label={format(day, "EEEE d. M. yyyy", { locale: sk })}
                    >
                      <span
                        className={cn(
                          "flex items-center justify-center rounded-full font-semibold",
                          dayColWidth < 28
                            ? "size-5 text-[9px]"
                            : dayColWidth < 40
                              ? "size-6 text-[10px]"
                              : "size-7 text-xs",
                          isTodayDay && "bg-teal-700 text-white",
                          selected &&
                            !isTodayDay &&
                            "bg-foreground text-background",
                          !isTodayDay &&
                            !selected &&
                            (weekend
                              ? "text-muted-foreground"
                              : "text-foreground"),
                          monthStart &&
                            !isTodayDay &&
                            !selected &&
                            "ring-1 ring-border",
                        )}
                      >
                        {format(day, "d")}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

function PaymentBarSegment({
  payment,
  currency,
  weight,
  roundedTop,
  roundedBottom,
  onSelect,
}: {
  payment: TimelinePayment;
  currency: string;
  weight: number;
  roundedTop: boolean;
  roundedBottom: boolean;
  onSelect: () => void;
}) {
  const amount = toNumber(payment.amount);
  const color =
    payment.itemColor ??
    (payment.type === "income"
      ? "#059669"
      : payment.category.color || DEFAULT_ITEM_COLOR);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onSelect}
          className={cn(
            "w-full min-h-[3px] basis-0 transition-[filter] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            roundedTop && "rounded-t-md",
            roundedBottom && "rounded-b-[1px]",
          )}
          style={{
            flexGrow: Math.max(weight, 0.01),
            backgroundColor: color,
          }}
          aria-label={`${payment.title}: ${formatMoney(amount, currency)}${payment.status === "actual" ? " (uhradené)" : ""}`}
        />
      </TooltipTrigger>
      <TooltipContent
        side="top"
        showArrow={false}
        className="max-w-56 border border-border bg-popover px-3 py-2 text-popover-foreground shadow-md"
      >
        <div className="space-y-1">
          <div className="flex items-start gap-2">
            <span
              className="mt-1 size-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: color }}
            />
            <p className="font-medium leading-tight">{payment.title}</p>
          </div>
          <p className="flex items-center justify-between gap-3 pl-[1.125rem] tabular-nums">
            <span className="text-muted-foreground">
              {payment.category.name}
            </span>
            <span
              className={cn(
                "font-semibold",
                payment.type === "income"
                  ? "text-emerald-600"
                  : "text-foreground",
              )}
            >
              {payment.type === "income" ? "+" : ""}
              {formatMoney(amount, currency)}
            </span>
          </p>
          <p className="pl-[1.125rem] text-[10px] text-muted-foreground">
            {payment.type === "expense" ? "Výdavok" : "Príjem"}
            {payment.status === "actual" ? " · uhradené" : ""}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

const MONTH_COL_WIDTH = 64;
const MONTH_BAR_MAX_HEIGHT = 140;
const MONTH_CHUNK = 12;
const MONTH_EDGE_PX = MONTH_COL_WIDTH * 5;
const MONTH_MAX_WINDOW = 120;
/** Enough past months to center on wide screens without clamping to scrollLeft=0. */
const MONTH_INITIAL_PAST = 36;
const MONTH_INITIAL_FUTURE = 24;

function yearKeysInRange(from: Date, to: Date) {
  return eachYearOfInterval({
    start: startOfYear(from),
    end: startOfYear(to),
  }).map((year) => format(year, "yyyy"));
}

function ContinuousMonthTimeline({
  focusDate,
  currency,
  initialPayments,
  initialEvents,
  fetchPeriod,
  selectedMonthKey,
  onOpenMonth,
  onHeaderChange,
  controlsRef,
  scrollerRef,
}: {
  focusDate: Date;
  currency: string;
  initialPayments: TimelinePayment[];
  initialEvents: TimelineEvent[];
  fetchPeriod: (from: string, to: string) => Promise<TimelinePeriodData>;
  selectedMonthKey: string | null;
  onOpenMonth: (monthStart: Date) => void;
  onHeaderChange: (header: TimelineHeaderInfo) => void;
  controlsRef: React.MutableRefObject<TimelineControls | null>;
  scrollerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const todayMonth = useMemo(() => startOfMonth(new Date()), []);
  const focusMonth = useMemo(() => startOfMonth(focusDate), [focusDate]);
  const [windowStart, setWindowStart] = useState(() =>
    subMonths(focusMonth, MONTH_INITIAL_PAST),
  );
  const [windowEnd, setWindowEnd] = useState(() =>
    addMonths(focusMonth, MONTH_INITIAL_FUTURE),
  );
  // Start empty — SSR initialPayments are only the current month; showing them
  // first makes October appear alone, then other months "pop in".
  const [payments, setPayments] = useState<TimelinePayment[]>([]);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loadingEdge, setLoadingEdge] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);

  const todayRef = useRef<HTMLButtonElement>(null);
  const focusButtonRef = useRef<HTMLButtonElement>(null);
  const loadedYearsRef = useRef(new Set<string>());
  const loadingEdgeRef = useRef<"start" | "end" | null>(null);
  const prependAdjustRef = useRef(0);
  const didInitialScrollRef = useRef(false);
  const didLayoutCenterRef = useRef(false);
  const lastScrollLeftRef = useRef(0);
  const barScaleMaxRef = useRef(0);

  const months = useMemo(
    () => eachMonthOfInterval({ start: windowStart, end: windowEnd }),
    [windowStart, windowEnd],
  );

  const paymentsByMonth = useMemo(() => {
    const map = new Map<string, TimelinePayment[]>();
    for (const p of payments) {
      const key = p.date.slice(0, 7);
      const bucket = map.get(key) ?? [];
      bucket.push(p);
      map.set(key, bucket);
    }
    return map;
  }, [payments]);

  const eventsByMonth = useMemo(() => {
    const map = new Map<string, TimelineEvent[]>();
    for (const e of events) {
      const key = e.eventDate.slice(0, 7);
      const bucket = map.get(key) ?? [];
      bucket.push(e);
      map.set(key, bucket);
    }
    return map;
  }, [events]);

  const maxMonthExpense = useMemo(() => {
    let max = 0;
    for (const list of paymentsByMonth.values()) {
      const total = list.reduce(
        (sum, p) =>
          p.type === "expense" ? sum + Math.abs(toNumber(p.amount)) : sum,
        0,
      );
      if (total > max) max = total;
    }
    return max || 1;
  }, [paymentsByMonth]);

  // Never shrink the scale after bootstrap — avoids bar-height jumps when
  // extra years load in the background.
  if (bootstrapped && maxMonthExpense > barScaleMaxRef.current) {
    barScaleMaxRef.current = maxMonthExpense;
  }
  const barScaleMax =
    bootstrapped && barScaleMaxRef.current > 0
      ? barScaleMaxRef.current
      : maxMonthExpense;

  const { scaleMax, ticks: priceTicks } = useMemo(
    () => nicePriceScale(barScaleMax),
    [barScaleMax],
  );

  const mergeData = useCallback((data: TimelinePeriodData) => {
    setPayments((prev) => {
      const seen = new Set(prev.map((p) => p.id));
      const next = [...prev];
      for (const p of data.payments) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          next.push(p);
        }
      }
      return next;
    });
    setEvents((prev) => {
      const seen = new Set(prev.map((e) => e.id));
      const next = [...prev];
      for (const e of data.events) {
        if (!seen.has(e.id)) {
          seen.add(e.id);
          next.push(e);
        }
      }
      return next;
    });
  }, []);

  const yearInflightRef = useRef(
    new Map<string, Promise<TimelinePeriodData | null>>(),
  );

  const fetchYearsData = useCallback(
    async (from: Date, to: Date): Promise<TimelinePeriodData> => {
      const keys = yearKeysInRange(from, to);

      const results = await Promise.all(
        keys.map(async (key) => {
          // Already committed as loaded — re-read from period cache.
          if (loadedYearsRef.current.has(key)) {
            const year = parseISO(`${key}-01-01`);
            return fetchPeriod(
              format(startOfYear(year), "yyyy-MM-dd"),
              format(endOfYear(year), "yyyy-MM-dd"),
            );
          }

          const inflight = yearInflightRef.current.get(key);
          if (inflight) return inflight;

          const promise = (async () => {
            const year = parseISO(`${key}-01-01`);
            const fromDate = format(startOfYear(year), "yyyy-MM-dd");
            const toDate = format(endOfYear(year), "yyyy-MM-dd");
            try {
              const data = await fetchPeriod(fromDate, toDate);
              loadedYearsRef.current.add(key);
              return data;
            } catch (err) {
              console.error("Timeline year load failed", err);
              return null;
            } finally {
              yearInflightRef.current.delete(key);
            }
          })();

          yearInflightRef.current.set(key, promise);
          return promise;
        }),
      );

      const combined: TimelinePeriodData = { payments: [], events: [] };
      for (const data of results) {
        if (!data) continue;
        combined.payments.push(...data.payments);
        combined.events.push(...data.events);
      }
      return combined;
    },
    [fetchPeriod],
  );

  const ensureYearsLoaded = useCallback(
    async (from: Date, to: Date) => {
      setLoadingEdge(true);
      try {
        const combined = await fetchYearsData(from, to);
        if (combined.payments.length > 0 || combined.events.length > 0) {
          mergeData(combined);
        }
      } finally {
        setLoadingEdge(false);
      }
    },
    [fetchYearsData, mergeData],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const combined = await fetchYearsData(windowStart, windowEnd);
        if (cancelled) return;

        // Seed SSR month on top of fetched years (deduped) so we never paint
        // a partial October-only chart before the rest arrives.
        const paymentIds = new Set(combined.payments.map((p) => p.id));
        const eventIds = new Set(combined.events.map((e) => e.id));
        const nextPayments = [...combined.payments];
        const nextEvents = [...combined.events];
        for (const p of initialPayments) {
          if (!paymentIds.has(p.id)) nextPayments.push(p);
        }
        for (const e of initialEvents) {
          if (!eventIds.has(e.id)) nextEvents.push(e);
        }

        const byMonth = new Map<string, number>();
        for (const p of nextPayments) {
          if (p.type !== "expense") continue;
          const key = p.date.slice(0, 7);
          byMonth.set(
            key,
            (byMonth.get(key) ?? 0) + Math.abs(toNumber(p.amount)),
          );
        }
        let max = 0;
        for (const total of byMonth.values()) {
          if (total > max) max = total;
        }
        barScaleMaxRef.current = max || 1;

        setPayments(nextPayments);
        setEvents(nextEvents);
        setBootstrapped(true);
      } catch (err) {
        console.error("Month timeline bootstrap failed", err);
        if (!cancelled) {
          setPayments(initialPayments);
          setEvents(initialEvents);
          setBootstrapped(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial bootstrap only
  }, []);

  const centerOn = useCallback(
    (root: HTMLDivElement, target: Date) => {
      const index = Math.max(
        0,
        differenceInCalendarMonths(target, windowStart),
      );
      const nextScroll = Math.max(
        0,
        index * MONTH_COL_WIDTH - root.clientWidth / 2 + MONTH_COL_WIDTH / 2,
      );
      root.scrollLeft = nextScroll;
      lastScrollLeftRef.current = nextScroll;
    },
    [windowStart],
  );

  const assignScrollerRef = useCallback(
    (node: HTMLDivElement | null) => {
      (scrollerRef as React.MutableRefObject<HTMLDivElement | null>).current =
        node;
      if (!node || didInitialScrollRef.current) return;

      const target =
        todayMonth >= windowStart && todayMonth <= windowEnd
          ? todayMonth
          : focusMonth;
      centerOn(node, target);
      didInitialScrollRef.current = true;
      if (barScaleMaxRef.current <= 0) {
        barScaleMaxRef.current = maxMonthExpense;
      }
    },
    [
      scrollerRef,
      todayMonth,
      windowStart,
      windowEnd,
      focusMonth,
      centerOn,
      maxMonthExpense,
    ],
  );

  useLayoutEffect(() => {
    const root = scrollerRef.current;
    if (!root || !bootstrapped) return;

    if (prependAdjustRef.current !== 0) {
      root.scrollLeft += prependAdjustRef.current;
      lastScrollLeftRef.current = root.scrollLeft;
      prependAdjustRef.current = 0;
      return;
    }

    // Second pass: ref may have run before clientWidth settled.
    if (didLayoutCenterRef.current || root.clientWidth <= 0) return;
    didLayoutCenterRef.current = true;
    const target =
      todayMonth >= windowStart && todayMonth <= windowEnd
        ? todayMonth
        : focusMonth;
    centerOn(root, target);
  }, [
    bootstrapped,
    months,
    scrollerRef,
    todayMonth,
    windowStart,
    windowEnd,
    focusMonth,
    centerOn,
  ]);

  const expandStart = useCallback(async () => {
    if (loadingEdgeRef.current) return;
    loadingEdgeRef.current = "start";

    const prevStart = windowStart;
    const nextStart = subMonths(prevStart, MONTH_CHUNK);
    prependAdjustRef.current += MONTH_CHUNK * MONTH_COL_WIDTH;
    setWindowStart(nextStart);

    const span = differenceInCalendarMonths(windowEnd, nextStart) + 1;
    if (span > MONTH_MAX_WINDOW) {
      setWindowEnd(addMonths(nextStart, MONTH_MAX_WINDOW - 1));
    }

    try {
      await ensureYearsLoaded(nextStart, prevStart);
    } finally {
      requestAnimationFrame(() => {
        loadingEdgeRef.current = null;
      });
    }
  }, [windowStart, windowEnd, ensureYearsLoaded]);

  const expandEnd = useCallback(async () => {
    if (loadingEdgeRef.current) return;
    loadingEdgeRef.current = "end";

    const prevEnd = windowEnd;
    const nextEnd = addMonths(prevEnd, MONTH_CHUNK);
    setWindowEnd(nextEnd);

    const span = differenceInCalendarMonths(nextEnd, windowStart) + 1;
    if (span > MONTH_MAX_WINDOW) {
      const pruned = span - MONTH_MAX_WINDOW;
      prependAdjustRef.current -= pruned * MONTH_COL_WIDTH;
      setWindowStart(addMonths(windowStart, pruned));
    }

    try {
      await ensureYearsLoaded(prevEnd, nextEnd);
    } finally {
      requestAnimationFrame(() => {
        loadingEdgeRef.current = null;
      });
    }
  }, [windowStart, windowEnd, ensureYearsLoaded]);

  const updateHeaderFromScroll = useCallback(() => {
    const root = scrollerRef.current;
    if (!root || months.length === 0) return;

    const centerOffset = root.scrollLeft + root.clientWidth / 2;
    const index = Math.min(
      months.length - 1,
      Math.max(0, Math.floor(centerOffset / MONTH_COL_WIDTH)),
    );
    const centerMonth = months[index] ?? focusMonth;
    const bounds = headerBoundsForMonth(centerMonth);
    const yearKey = format(centerMonth, "yyyy");

    let expenseTotal = 0;
    let eventCount = 0;
    for (const [monthKey, list] of paymentsByMonth) {
      if (!monthKey.startsWith(yearKey)) continue;
      for (const p of list) {
        if (p.type === "expense") expenseTotal += toNumber(p.amount);
      }
    }
    for (const [monthKey, list] of eventsByMonth) {
      if (!monthKey.startsWith(yearKey)) continue;
      eventCount += list.length;
    }

    onHeaderChange({
      ...bounds,
      expenseTotal,
      eventCount,
      loading: loadingEdge,
    });
  }, [
    months,
    focusMonth,
    paymentsByMonth,
    eventsByMonth,
    loadingEdge,
    onHeaderChange,
    scrollerRef,
  ]);

  useEffect(() => {
    if (!bootstrapped) {
      onHeaderChange({
        ...headerBoundsForMonth(focusMonth),
        expenseTotal: 0,
        eventCount: 0,
        loading: true,
      });
      return;
    }
    updateHeaderFromScroll();
  }, [bootstrapped, focusMonth, onHeaderChange, updateHeaderFromScroll]);

  useEffect(() => {
    if (!bootstrapped) return;
    const root = scrollerRef.current;
    if (!root) return;

    const onScroll = () => {
      updateHeaderFromScroll();

      const { scrollLeft, scrollWidth, clientWidth } = root;
      const maxScroll = Math.max(scrollWidth - clientWidth, 0);
      const prev = lastScrollLeftRef.current;
      lastScrollLeftRef.current = scrollLeft;

      if (loadingEdgeRef.current) return;

      // Only load when the user scrolls *toward* an edge. Sitting near an edge
      // after programmatic centering must not trigger a jump.
      if (scrollLeft <= MONTH_EDGE_PX && scrollLeft < prev - 1) {
        void expandStart();
        return;
      }
      if (scrollLeft >= maxScroll - MONTH_EDGE_PX && scrollLeft > prev + 1) {
        void expandEnd();
      }
    };

    root.addEventListener("scroll", onScroll, { passive: true });
    return () => root.removeEventListener("scroll", onScroll);
  }, [bootstrapped, scrollerRef, expandStart, expandEnd, updateHeaderFromScroll]);

  useEffect(() => {
    controlsRef.current = {
      scrollByPage: (direction) => {
        const root = scrollerRef.current;
        if (!root) return;
        root.scrollBy({
          left:
            direction *
            Math.max(root.clientWidth * 0.85, MONTH_COL_WIDTH * 6),
          behavior: "smooth",
        });
      },
      scrollToToday: () => {
        if (todayMonth < windowStart || todayMonth > windowEnd) {
          setWindowStart(subMonths(todayMonth, MONTH_INITIAL_PAST));
          setWindowEnd(addMonths(todayMonth, MONTH_INITIAL_FUTURE));
          prependAdjustRef.current = 0;
          didInitialScrollRef.current = false;
          didLayoutCenterRef.current = false;
          setBootstrapped(false);
          void ensureYearsLoaded(
            subMonths(todayMonth, MONTH_INITIAL_PAST),
            addMonths(todayMonth, MONTH_INITIAL_FUTURE),
          ).then(() => setBootstrapped(true));
          return;
        }

        const root = scrollerRef.current;
        if (root) centerOn(root, todayMonth);
      },
    };

    return () => {
      controlsRef.current = null;
    };
  }, [
    controlsRef,
    scrollerRef,
    todayMonth,
    windowStart,
    windowEnd,
    ensureYearsLoaded,
    centerOn,
  ]);

  if (!bootstrapped) {
    return (
      <div className="flex h-[13.5rem] items-center justify-center rounded-xl border border-border bg-white">
        <span className="text-xs text-muted-foreground">Načítavam…</span>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={80}>
      <div className="flex overflow-hidden rounded-xl border border-border bg-white">
        <TimelinePriceAxis
          ticks={priceTicks}
          scaleMax={scaleMax}
          barMaxHeight={MONTH_BAR_MAX_HEIGHT}
          currency={currency}
        />
        <div
          ref={assignScrollerRef}
          className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="relative flex w-max items-stretch pb-2 pt-3">
            <TimelinePriceLines
              ticks={priceTicks}
              scaleMax={scaleMax}
              barMaxHeight={MONTH_BAR_MAX_HEIGHT}
            />

            <div className="relative z-[1] flex px-1">
            {months.map((monthStart) => {
              const key = format(monthStart, "yyyy-MM");
              const monthPayments = paymentsByMonth.get(key) ?? [];
              const monthEvents = eventsByMonth.get(key) ?? [];
              const expenseTotal = monthPayments.reduce(
                (sum, p) =>
                  p.type === "expense"
                    ? sum + Math.abs(toNumber(p.amount))
                    : sum,
                0,
              );
              const incomeTotal = monthPayments.reduce(
                (sum, p) =>
                  p.type === "income"
                    ? sum + Math.abs(toNumber(p.amount))
                    : sum,
                0,
              );
              const hasActivity =
                monthPayments.length > 0 || monthEvents.length > 0;
              const current = isSameMonth(monthStart, todayMonth);
              const isFocusMonth = isSameMonth(monthStart, focusMonth);
              const selected = selectedMonthKey === key;
              const yearStart = monthStart.getMonth() === 0;
              const barHeight =
                expenseTotal > 0
                  ? Math.max(
                      8,
                      Math.round(
                        (expenseTotal / scaleMax) * MONTH_BAR_MAX_HEIGHT,
                      ),
                    )
                  : 0;
              const monthLabel = format(monthStart, "LLLL yyyy", {
                locale: sk,
              });

              return (
                <div
                  key={key}
                  className="relative flex shrink-0 flex-col items-center"
                  style={{ width: MONTH_COL_WIDTH }}
                >
                  {yearStart ? (
                    <>
                      <span
                        className="pointer-events-none absolute inset-y-1 left-0 z-[2] w-px bg-foreground/30"
                        aria-hidden
                      />
                      <TimelineAxisLabel
                        primary={format(monthStart, "yyyy")}
                      />
                    </>
                  ) : null}
                  {current ? (
                    <span className="pointer-events-none absolute inset-y-1 left-1/2 w-px -translate-x-1/2 bg-teal-700/25" />
                  ) : null}

                  <div
                    className="relative z-[1] flex w-full flex-col items-center justify-end px-1"
                    style={{ height: MONTH_BAR_MAX_HEIGHT }}
                  >
                    {expenseTotal > 0 ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => onOpenMonth(monthStart)}
                            className="w-[72%] min-w-[14px] max-w-11 rounded-t-md bg-teal-700 shadow-sm ring-1 ring-black/5 transition-[filter] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                            style={{ height: barHeight }}
                            aria-label={`${monthLabel}: ${formatMoney(expenseTotal, currency)}`}
                          />
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          showArrow={false}
                          className="max-w-56 border border-border bg-popover px-3 py-2 text-popover-foreground shadow-md"
                        >
                          <div className="space-y-1">
                            <p className="font-medium capitalize leading-tight">
                              {monthLabel}
                            </p>
                            <p className="flex items-center justify-between gap-3 tabular-nums">
                              <span className="text-muted-foreground">
                                Výdavky
                              </span>
                              <span className="font-semibold">
                                {formatMoney(expenseTotal, currency)}
                              </span>
                            </p>
                            {incomeTotal > 0 ? (
                              <p className="flex items-center justify-between gap-3 tabular-nums">
                                <span className="text-muted-foreground">
                                  Príjmy
                                </span>
                                <span className="font-semibold text-emerald-600">
                                  +{formatMoney(incomeTotal, currency)}
                                </span>
                              </p>
                            ) : null}
                            <p className="text-[10px] text-muted-foreground">
                              {monthPayments.length}{" "}
                              {monthPayments.length === 1
                                ? "platba"
                                : monthPayments.length < 5
                                  ? "platby"
                                  : "platieb"}
                              {monthEvents.length > 0
                                ? ` · ${monthEvents.length} termínov`
                                : ""}
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ) : null}
                  </div>

                  <div className="relative z-[1] flex h-4 w-full items-center justify-center gap-0.5">
                    {monthEvents.slice(0, 3).map((ev) => (
                      <span
                        key={ev.id}
                        className={cn(
                          "size-1.5 rotate-45 rounded-[1px]",
                          EVENT_DOT[ev.type],
                        )}
                        title={ev.title}
                      />
                    ))}
                    {monthEvents.length > 3 ? (
                      <span className="text-[9px] text-muted-foreground">+</span>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    ref={(node) => {
                      if (current) todayRef.current = node;
                      if (isFocusMonth) focusButtonRef.current = node;
                    }}
                    onClick={() => onOpenMonth(monthStart)}
                    className={cn(
                      "relative z-[1] mt-0.5 flex flex-col items-center gap-0.5 pb-1",
                      !hasActivity && "opacity-70",
                    )}
                    aria-label={`${monthLabel} — otvoriť denný graf`}
                  >
                    <span
                      className={cn(
                        "flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-xs font-semibold capitalize",
                        current && "bg-teal-700 text-white",
                        selected && !current && "bg-foreground text-background",
                        !current && !selected && "text-foreground",
                      )}
                    >
                      {format(monthStart, "LLL", { locale: sk })}
                    </span>
                  </button>
                </div>
              );
            })}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

const YEAR_COL_WIDTH = 72;
const YEAR_BAR_MAX_HEIGHT = 140;
const YEAR_CHUNK = 10;
const YEAR_EDGE_PX = YEAR_COL_WIDTH * 4;
const YEAR_MAX_WINDOW = 80;
const YEAR_INITIAL_PAST = 20;
const YEAR_INITIAL_FUTURE = 10;

function ContinuousYearTimeline({
  focusDate,
  currency,
  initialPayments,
  initialEvents,
  fetchPeriod,
  selectedYearKey,
  onOpenYear,
  onHeaderChange,
  controlsRef,
  scrollerRef,
}: {
  focusDate: Date;
  currency: string;
  initialPayments: TimelinePayment[];
  initialEvents: TimelineEvent[];
  fetchPeriod: (from: string, to: string) => Promise<TimelinePeriodData>;
  selectedYearKey: string | null;
  onOpenYear: (yearStart: Date) => void;
  onHeaderChange: (header: TimelineHeaderInfo) => void;
  controlsRef: React.MutableRefObject<TimelineControls | null>;
  scrollerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const todayYear = useMemo(() => startOfYear(new Date()), []);
  const focusYear = useMemo(() => startOfYear(focusDate), [focusDate]);
  const [windowStart, setWindowStart] = useState(() =>
    subYears(focusYear, YEAR_INITIAL_PAST),
  );
  const [windowEnd, setWindowEnd] = useState(() =>
    addYears(focusYear, YEAR_INITIAL_FUTURE),
  );
  const [payments, setPayments] = useState<TimelinePayment[]>([]);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loadingEdge, setLoadingEdge] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);

  const todayRef = useRef<HTMLButtonElement>(null);
  const focusButtonRef = useRef<HTMLButtonElement>(null);
  const loadedYearsRef = useRef(new Set<string>());
  const yearInflightRef = useRef(
    new Map<string, Promise<TimelinePeriodData | null>>(),
  );
  const loadingEdgeRef = useRef<"start" | "end" | null>(null);
  const prependAdjustRef = useRef(0);
  const didInitialScrollRef = useRef(false);
  const didLayoutCenterRef = useRef(false);
  const lastScrollLeftRef = useRef(0);
  const barScaleMaxRef = useRef(0);

  const years = useMemo(
    () => eachYearOfInterval({ start: windowStart, end: windowEnd }),
    [windowStart, windowEnd],
  );

  const paymentsByYear = useMemo(() => {
    const map = new Map<string, TimelinePayment[]>();
    for (const p of payments) {
      const key = p.date.slice(0, 4);
      const bucket = map.get(key) ?? [];
      bucket.push(p);
      map.set(key, bucket);
    }
    return map;
  }, [payments]);

  const eventsByYear = useMemo(() => {
    const map = new Map<string, TimelineEvent[]>();
    for (const e of events) {
      const key = e.eventDate.slice(0, 4);
      const bucket = map.get(key) ?? [];
      bucket.push(e);
      map.set(key, bucket);
    }
    return map;
  }, [events]);

  const maxYearExpense = useMemo(() => {
    let max = 0;
    for (const list of paymentsByYear.values()) {
      const total = list.reduce(
        (sum, p) =>
          p.type === "expense" ? sum + Math.abs(toNumber(p.amount)) : sum,
        0,
      );
      if (total > max) max = total;
    }
    return max || 1;
  }, [paymentsByYear]);

  if (bootstrapped && maxYearExpense > barScaleMaxRef.current) {
    barScaleMaxRef.current = maxYearExpense;
  }
  const barScaleMax =
    bootstrapped && barScaleMaxRef.current > 0
      ? barScaleMaxRef.current
      : maxYearExpense;

  const { scaleMax, ticks: priceTicks } = useMemo(
    () => nicePriceScale(barScaleMax),
    [barScaleMax],
  );

  const mergeData = useCallback((data: TimelinePeriodData) => {
    setPayments((prev) => {
      const seen = new Set(prev.map((p) => p.id));
      const next = [...prev];
      for (const p of data.payments) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          next.push(p);
        }
      }
      return next;
    });
    setEvents((prev) => {
      const seen = new Set(prev.map((e) => e.id));
      const next = [...prev];
      for (const e of data.events) {
        if (!seen.has(e.id)) {
          seen.add(e.id);
          next.push(e);
        }
      }
      return next;
    });
  }, []);

  const fetchYearsData = useCallback(
    async (from: Date, to: Date): Promise<TimelinePeriodData> => {
      const keys = yearKeysInRange(from, to);

      const results = await Promise.all(
        keys.map(async (key) => {
          if (loadedYearsRef.current.has(key)) {
            const year = parseISO(`${key}-01-01`);
            return fetchPeriod(
              format(startOfYear(year), "yyyy-MM-dd"),
              format(endOfYear(year), "yyyy-MM-dd"),
            );
          }

          const inflight = yearInflightRef.current.get(key);
          if (inflight) return inflight;

          const promise = (async () => {
            const year = parseISO(`${key}-01-01`);
            try {
              const data = await fetchPeriod(
                format(startOfYear(year), "yyyy-MM-dd"),
                format(endOfYear(year), "yyyy-MM-dd"),
              );
              loadedYearsRef.current.add(key);
              return data;
            } catch (err) {
              console.error("Timeline year load failed", err);
              return null;
            } finally {
              yearInflightRef.current.delete(key);
            }
          })();

          yearInflightRef.current.set(key, promise);
          return promise;
        }),
      );

      const combined: TimelinePeriodData = { payments: [], events: [] };
      for (const data of results) {
        if (!data) continue;
        combined.payments.push(...data.payments);
        combined.events.push(...data.events);
      }
      return combined;
    },
    [fetchPeriod],
  );

  const ensureYearsLoaded = useCallback(
    async (from: Date, to: Date) => {
      setLoadingEdge(true);
      try {
        const combined = await fetchYearsData(from, to);
        if (combined.payments.length > 0 || combined.events.length > 0) {
          mergeData(combined);
        }
      } finally {
        setLoadingEdge(false);
      }
    },
    [fetchYearsData, mergeData],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const combined = await fetchYearsData(windowStart, windowEnd);
        if (cancelled) return;

        const paymentIds = new Set(combined.payments.map((p) => p.id));
        const eventIds = new Set(combined.events.map((e) => e.id));
        const nextPayments = [...combined.payments];
        const nextEvents = [...combined.events];
        for (const p of initialPayments) {
          if (!paymentIds.has(p.id)) nextPayments.push(p);
        }
        for (const e of initialEvents) {
          if (!eventIds.has(e.id)) nextEvents.push(e);
        }

        const byYear = new Map<string, number>();
        for (const p of nextPayments) {
          if (p.type !== "expense") continue;
          const key = p.date.slice(0, 4);
          byYear.set(key, (byYear.get(key) ?? 0) + Math.abs(toNumber(p.amount)));
        }
        let max = 0;
        for (const total of byYear.values()) {
          if (total > max) max = total;
        }
        barScaleMaxRef.current = max || 1;

        setPayments(nextPayments);
        setEvents(nextEvents);
        setBootstrapped(true);
      } catch (err) {
        console.error("Year timeline bootstrap failed", err);
        if (!cancelled) {
          setPayments(initialPayments);
          setEvents(initialEvents);
          setBootstrapped(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial bootstrap only
  }, []);

  const centerOn = useCallback(
    (root: HTMLDivElement, target: Date) => {
      const index = Math.max(
        0,
        differenceInCalendarYears(target, windowStart),
      );
      const nextScroll = Math.max(
        0,
        index * YEAR_COL_WIDTH - root.clientWidth / 2 + YEAR_COL_WIDTH / 2,
      );
      root.scrollLeft = nextScroll;
      lastScrollLeftRef.current = nextScroll;
    },
    [windowStart],
  );

  const assignScrollerRef = useCallback(
    (node: HTMLDivElement | null) => {
      (scrollerRef as React.MutableRefObject<HTMLDivElement | null>).current =
        node;
      if (!node || didInitialScrollRef.current) return;

      const target =
        todayYear >= windowStart && todayYear <= windowEnd
          ? todayYear
          : focusYear;
      centerOn(node, target);
      didInitialScrollRef.current = true;
      if (barScaleMaxRef.current <= 0) {
        barScaleMaxRef.current = maxYearExpense;
      }
    },
    [
      scrollerRef,
      todayYear,
      windowStart,
      windowEnd,
      focusYear,
      centerOn,
      maxYearExpense,
    ],
  );

  useLayoutEffect(() => {
    const root = scrollerRef.current;
    if (!root || !bootstrapped) return;

    if (prependAdjustRef.current !== 0) {
      root.scrollLeft += prependAdjustRef.current;
      lastScrollLeftRef.current = root.scrollLeft;
      prependAdjustRef.current = 0;
      return;
    }

    if (didLayoutCenterRef.current || root.clientWidth <= 0) return;
    didLayoutCenterRef.current = true;
    const target =
      todayYear >= windowStart && todayYear <= windowEnd
        ? todayYear
        : focusYear;
    centerOn(root, target);
  }, [
    bootstrapped,
    years,
    scrollerRef,
    todayYear,
    windowStart,
    windowEnd,
    focusYear,
    centerOn,
  ]);

  const expandStart = useCallback(async () => {
    if (loadingEdgeRef.current) return;
    loadingEdgeRef.current = "start";

    const prevStart = windowStart;
    const nextStart = subYears(prevStart, YEAR_CHUNK);
    prependAdjustRef.current += YEAR_CHUNK * YEAR_COL_WIDTH;
    setWindowStart(nextStart);

    const span = differenceInCalendarYears(windowEnd, nextStart) + 1;
    if (span > YEAR_MAX_WINDOW) {
      setWindowEnd(addYears(nextStart, YEAR_MAX_WINDOW - 1));
    }

    try {
      await ensureYearsLoaded(nextStart, prevStart);
    } finally {
      requestAnimationFrame(() => {
        loadingEdgeRef.current = null;
      });
    }
  }, [windowStart, windowEnd, ensureYearsLoaded]);

  const expandEnd = useCallback(async () => {
    if (loadingEdgeRef.current) return;
    loadingEdgeRef.current = "end";

    const prevEnd = windowEnd;
    const nextEnd = addYears(prevEnd, YEAR_CHUNK);
    setWindowEnd(nextEnd);

    const span = differenceInCalendarYears(nextEnd, windowStart) + 1;
    if (span > YEAR_MAX_WINDOW) {
      const pruned = span - YEAR_MAX_WINDOW;
      prependAdjustRef.current -= pruned * YEAR_COL_WIDTH;
      setWindowStart(addYears(windowStart, pruned));
    }

    try {
      await ensureYearsLoaded(prevEnd, nextEnd);
    } finally {
      requestAnimationFrame(() => {
        loadingEdgeRef.current = null;
      });
    }
  }, [windowStart, windowEnd, ensureYearsLoaded]);

  const updateHeaderFromScroll = useCallback(() => {
    const root = scrollerRef.current;
    if (!root || years.length === 0) return;

    const centerOffset = root.scrollLeft + root.clientWidth / 2;
    const index = Math.min(
      years.length - 1,
      Math.max(0, Math.floor(centerOffset / YEAR_COL_WIDTH)),
    );
    const centerYear = years[index] ?? focusYear;
    const bounds = headerBoundsForYear(centerYear);
    const decadeFrom = Number(bounds.from.slice(0, 4));
    const decadeTo = Number(bounds.to.slice(0, 4));

    let expenseTotal = 0;
    let eventCount = 0;
    for (const [yearKey, list] of paymentsByYear) {
      const y = Number(yearKey);
      if (y < decadeFrom || y > decadeTo) continue;
      for (const p of list) {
        if (p.type === "expense") expenseTotal += toNumber(p.amount);
      }
    }
    for (const [yearKey, list] of eventsByYear) {
      const y = Number(yearKey);
      if (y < decadeFrom || y > decadeTo) continue;
      eventCount += list.length;
    }

    onHeaderChange({
      ...bounds,
      expenseTotal,
      eventCount,
      loading: loadingEdge,
    });
  }, [
    years,
    focusYear,
    paymentsByYear,
    eventsByYear,
    loadingEdge,
    onHeaderChange,
    scrollerRef,
  ]);

  useEffect(() => {
    if (!bootstrapped) {
      onHeaderChange({
        ...headerBoundsForYear(focusYear),
        expenseTotal: 0,
        eventCount: 0,
        loading: true,
      });
      return;
    }
    updateHeaderFromScroll();
  }, [bootstrapped, focusYear, onHeaderChange, updateHeaderFromScroll]);

  useEffect(() => {
    if (!bootstrapped) return;
    const root = scrollerRef.current;
    if (!root) return;

    const onScroll = () => {
      updateHeaderFromScroll();

      const { scrollLeft, scrollWidth, clientWidth } = root;
      const maxScroll = Math.max(scrollWidth - clientWidth, 0);
      const prev = lastScrollLeftRef.current;
      lastScrollLeftRef.current = scrollLeft;

      if (loadingEdgeRef.current) return;

      if (scrollLeft <= YEAR_EDGE_PX && scrollLeft < prev - 1) {
        void expandStart();
        return;
      }
      if (scrollLeft >= maxScroll - YEAR_EDGE_PX && scrollLeft > prev + 1) {
        void expandEnd();
      }
    };

    root.addEventListener("scroll", onScroll, { passive: true });
    return () => root.removeEventListener("scroll", onScroll);
  }, [bootstrapped, scrollerRef, expandStart, expandEnd, updateHeaderFromScroll]);

  useEffect(() => {
    controlsRef.current = {
      scrollByPage: (direction) => {
        const root = scrollerRef.current;
        if (!root) return;
        root.scrollBy({
          left:
            direction *
            Math.max(root.clientWidth * 0.85, YEAR_COL_WIDTH * 5),
          behavior: "smooth",
        });
      },
      scrollToToday: () => {
        if (todayYear < windowStart || todayYear > windowEnd) {
          setWindowStart(subYears(todayYear, YEAR_INITIAL_PAST));
          setWindowEnd(addYears(todayYear, YEAR_INITIAL_FUTURE));
          prependAdjustRef.current = 0;
          didInitialScrollRef.current = false;
          didLayoutCenterRef.current = false;
          setBootstrapped(false);
          void fetchYearsData(
            subYears(todayYear, YEAR_INITIAL_PAST),
            addYears(todayYear, YEAR_INITIAL_FUTURE),
          ).then((combined) => {
            setPayments(combined.payments);
            setEvents(combined.events);
            setBootstrapped(true);
          });
          return;
        }

        const root = scrollerRef.current;
        if (root) centerOn(root, todayYear);
      },
    };

    return () => {
      controlsRef.current = null;
    };
  }, [
    controlsRef,
    scrollerRef,
    todayYear,
    windowStart,
    windowEnd,
    fetchYearsData,
    centerOn,
  ]);

  if (!bootstrapped) {
    return (
      <div className="flex h-[13.5rem] items-center justify-center rounded-xl border border-border bg-white">
        <span className="text-xs text-muted-foreground">Načítavam…</span>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={80}>
      <div className="flex overflow-hidden rounded-xl border border-border bg-white">
        <TimelinePriceAxis
          ticks={priceTicks}
          scaleMax={scaleMax}
          barMaxHeight={YEAR_BAR_MAX_HEIGHT}
          currency={currency}
        />
        <div
          ref={assignScrollerRef}
          className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="relative flex w-max items-stretch pb-2 pt-3">
            <TimelinePriceLines
              ticks={priceTicks}
              scaleMax={scaleMax}
              barMaxHeight={YEAR_BAR_MAX_HEIGHT}
            />

            <div className="relative z-[1] flex px-1">
            {years.map((yearStart) => {
              const key = format(yearStart, "yyyy");
              const yearPayments = paymentsByYear.get(key) ?? [];
              const yearEvents = eventsByYear.get(key) ?? [];
              const expenseTotal = yearPayments.reduce(
                (sum, p) =>
                  p.type === "expense"
                    ? sum + Math.abs(toNumber(p.amount))
                    : sum,
                0,
              );
              const incomeTotal = yearPayments.reduce(
                (sum, p) =>
                  p.type === "income"
                    ? sum + Math.abs(toNumber(p.amount))
                    : sum,
                0,
              );
              const hasActivity =
                yearPayments.length > 0 || yearEvents.length > 0;
              const current = isSameYear(yearStart, todayYear);
              const isFocusYear = isSameYear(yearStart, focusYear);
              const selected = selectedYearKey === key;
              const barHeight =
                expenseTotal > 0
                  ? Math.max(
                      8,
                      Math.round(
                        (expenseTotal / scaleMax) * YEAR_BAR_MAX_HEIGHT,
                      ),
                    )
                  : 0;

              return (
                <div
                  key={key}
                  className="relative flex shrink-0 flex-col items-center"
                  style={{ width: YEAR_COL_WIDTH }}
                >
                  {current ? (
                    <span className="pointer-events-none absolute inset-y-1 left-1/2 w-px -translate-x-1/2 bg-teal-700/25" />
                  ) : null}

                  <div
                    className="relative z-[1] flex w-full flex-col items-center justify-end px-1"
                    style={{ height: YEAR_BAR_MAX_HEIGHT }}
                  >
                    {expenseTotal > 0 ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => onOpenYear(yearStart)}
                            className="w-[72%] min-w-[16px] max-w-12 rounded-t-md bg-teal-700 shadow-sm ring-1 ring-black/5 transition-[filter] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                            style={{ height: barHeight }}
                            aria-label={`${key}: ${formatMoney(expenseTotal, currency)}`}
                          />
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          showArrow={false}
                          className="max-w-56 border border-border bg-popover px-3 py-2 text-popover-foreground shadow-md"
                        >
                          <div className="space-y-1">
                            <p className="font-medium leading-tight">{key}</p>
                            <p className="flex items-center justify-between gap-3 tabular-nums">
                              <span className="text-muted-foreground">
                                Výdavky
                              </span>
                              <span className="font-semibold">
                                {formatMoney(expenseTotal, currency)}
                              </span>
                            </p>
                            {incomeTotal > 0 ? (
                              <p className="flex items-center justify-between gap-3 tabular-nums">
                                <span className="text-muted-foreground">
                                  Príjmy
                                </span>
                                <span className="font-semibold text-emerald-600">
                                  +{formatMoney(incomeTotal, currency)}
                                </span>
                              </p>
                            ) : null}
                            <p className="text-[10px] text-muted-foreground">
                              {yearPayments.length}{" "}
                              {yearPayments.length === 1
                                ? "platba"
                                : yearPayments.length < 5
                                  ? "platby"
                                  : "platieb"}
                              {yearEvents.length > 0
                                ? ` · ${yearEvents.length} termínov`
                                : ""}
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ) : null}
                  </div>

                  <div className="relative z-[1] flex h-4 w-full items-center justify-center gap-0.5">
                    {yearEvents.slice(0, 3).map((ev) => (
                      <span
                        key={ev.id}
                        className={cn(
                          "size-1.5 rotate-45 rounded-[1px]",
                          EVENT_DOT[ev.type],
                        )}
                        title={ev.title}
                      />
                    ))}
                    {yearEvents.length > 3 ? (
                      <span className="text-[9px] text-muted-foreground">+</span>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    ref={(node) => {
                      if (current) todayRef.current = node;
                      if (isFocusYear) focusButtonRef.current = node;
                    }}
                    onClick={() => onOpenYear(yearStart)}
                    className={cn(
                      "relative z-[1] mt-0.5 flex flex-col items-center gap-0.5 pb-1",
                      !hasActivity && "opacity-70",
                    )}
                    aria-label={`${key} — otvoriť mesačný graf`}
                  >
                    <span
                      className={cn(
                        "flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                        current && "bg-teal-700 text-white",
                        selected && !current && "bg-foreground text-background",
                        !current && !selected && "text-foreground",
                      )}
                    >
                      {key}
                    </span>
                  </button>
                </div>
              );
            })}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

