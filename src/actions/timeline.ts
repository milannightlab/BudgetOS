"use server";

import { z } from "zod";
import {
  getPaymentTimelineData,
  getPropertySubtreeItemIds,
  getUpcomingAgenda,
} from "@/lib/queries";
import { ensureDbUser } from "@/lib/auth";
import { requireWorkspaceAccess } from "@/lib/workspace";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

async function authorizeWorkspace(workspaceIdRaw: string) {
  const workspaceId = z.string().min(1).parse(workspaceIdRaw);
  const user = await ensureDbUser();
  await requireWorkspaceAccess(workspaceId, user.id);
  return workspaceId;
}

async function resolvePropertyItemIds(
  workspaceId: string,
  propertyIdRaw?: string | null,
) {
  if (!propertyIdRaw) return undefined;
  const propertyId = z.string().min(1).parse(propertyIdRaw);
  return getPropertySubtreeItemIds(workspaceId, propertyId);
}

async function authorizePeriod(input: {
  workspaceId: string;
  fromDate: string;
  toDate: string;
  propertyId?: string | null;
}) {
  const workspaceId = await authorizeWorkspace(input.workspaceId);
  const fromDate = dateSchema.parse(input.fromDate);
  const toDate = dateSchema.parse(input.toDate);
  if (fromDate > toDate) {
    throw new Error("Neplatný rozsah dátumov");
  }

  const itemIds = await resolvePropertyItemIds(workspaceId, input.propertyId);
  return { workspaceId, fromDate, toDate, itemIds };
}

export async function loadPaymentTimelineAction(input: {
  workspaceId: string;
  fromDate: string;
  toDate: string;
  propertyId?: string | null;
}) {
  const { workspaceId, fromDate, toDate, itemIds } = await authorizePeriod(input);
  return getPaymentTimelineData(workspaceId, fromDate, toDate, itemIds);
}

export async function loadUpcomingAgendaAction(input: {
  workspaceId: string;
  fromDate?: string | null;
  toDate?: string | null;
  propertyId?: string | null;
}) {
  const workspaceId = await authorizeWorkspace(input.workspaceId);
  const fromDate = input.fromDate ? dateSchema.parse(input.fromDate) : null;
  const toDate = input.toDate ? dateSchema.parse(input.toDate) : null;
  if (fromDate && toDate && fromDate > toDate) {
    throw new Error("Neplatný rozsah dátumov");
  }

  const itemIds = await resolvePropertyItemIds(workspaceId, input.propertyId);
  return getUpcomingAgenda(workspaceId, fromDate, toDate, itemIds);
}
