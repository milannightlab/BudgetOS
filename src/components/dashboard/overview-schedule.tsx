"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { loadUpcomingAgendaAction } from "@/actions/timeline";
import { PaymentTimeline } from "@/components/dashboard/payment-timeline";
import { UpcomingAgenda } from "@/components/dashboard/upcoming-agenda";
import type { UpcomingAgendaItem } from "@/lib/agenda-types";
import type { TransactionItemOptionGroup } from "@/lib/transaction-item-picker";
import type {
  TimelineEvent,
  TimelinePayment,
} from "@/lib/timeline-types";

export function OverviewSchedule({
  workspaceId,
  currency,
  categories,
  itemPickerGroups,
  initialPayments,
  initialEvents,
  initialAgenda,
  initialFrom,
  initialTo,
  initialPeriodLabel,
  propertyId,
}: {
  workspaceId: string;
  currency: string;
  categories: { id: string; name: string }[];
  itemPickerGroups: TransactionItemOptionGroup[];
  initialPayments: TimelinePayment[];
  initialEvents: TimelineEvent[];
  initialAgenda: UpcomingAgendaItem[];
  initialFrom: string;
  initialTo: string;
  initialPeriodLabel: string;
  /** When set, timeline + agenda only include this property and its services. */
  propertyId?: string;
}) {
  const [agenda, setAgenda] = useState(initialAgenda);
  const [periodLabel, setPeriodLabel] = useState(initialPeriodLabel);
  const [timelineRevision, setTimelineRevision] = useState(0);
  const [pending, startTransition] = useTransition();
  const requestIdRef = useRef(0);
  const lastKeyRef = useRef(`${initialFrom}_${initialTo}`);

  const reloadAgenda = useCallback(
    (fromDate: string, toDate: string) => {
      const requestId = ++requestIdRef.current;
      startTransition(async () => {
        try {
          const next = await loadUpcomingAgendaAction({
            workspaceId,
            fromDate,
            toDate,
            propertyId,
          });
          if (requestId !== requestIdRef.current) return;
          setAgenda(next);
        } catch (err) {
          console.error("Agenda load failed", err);
        }
      });
    },
    [workspaceId, propertyId],
  );

  const handlePeriodChange = useCallback(
    (period: { from: string; to: string; label: string }) => {
      const key = `${period.from}_${period.to}`;
      if (key === lastKeyRef.current) {
        setPeriodLabel(period.label);
        return;
      }
      lastKeyRef.current = key;
      setPeriodLabel(period.label);
      reloadAgenda(period.from, period.to);
    },
    [reloadAgenda],
  );

  const handleTimelineCreated = useCallback(() => {
    const [fromDate, toDate] = lastKeyRef.current.split("_");
    if (!fromDate || !toDate) return;
    reloadAgenda(fromDate, toDate);
  }, [reloadAgenda]);

  useEffect(() => {
    lastKeyRef.current = `${initialFrom}_${initialTo}`;
    setAgenda(initialAgenda);
    setPeriodLabel(initialPeriodLabel);
  }, [initialAgenda, initialFrom, initialTo, initialPeriodLabel]);

  return (
    <div className="space-y-5">
      <PaymentTimeline
        workspaceId={workspaceId}
        categories={categories}
        itemPickerGroups={itemPickerGroups}
        initialPayments={initialPayments}
        initialEvents={initialEvents}
        currency={currency}
        propertyId={propertyId}
        onPeriodChange={handlePeriodChange}
        onCreated={handleTimelineCreated}
        dataRevision={timelineRevision}
      />
      <UpcomingAgenda
        workspaceId={workspaceId}
        items={agenda}
        currency={currency}
        categories={categories}
        itemPickerGroups={itemPickerGroups}
        periodLabel={periodLabel}
        loading={pending}
        onChanged={() => {
          const [fromDate, toDate] = lastKeyRef.current.split("_");
          if (!fromDate || !toDate) return;
          reloadAgenda(fromDate, toDate);
          setTimelineRevision((n) => n + 1);
        }}
      />
    </div>
  );
}
