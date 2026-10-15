"use server";

import { and, eq, inArray, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { itemRelations, items } from "@/db/schema";
import { assertVendorAccessible } from "@/actions/vendors";
import { ensureDbUser } from "@/lib/auth";
import { deletePrivateBlob, putPrivateBlob } from "@/lib/blob";
import { createId } from "@/lib/id";
import { requireWorkspaceAccess } from "@/lib/workspace";
import { parseItemColor } from "@/lib/item-color";
import {
  getItemTypeDefinition,
  parseAttributes,
} from "@/modules/item-types";
import { parseHiddenVehicleServiceTypes } from "@/modules/vehicle-services";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function revalidateVehicle(vehicleId: string, serviceId?: string) {
  revalidatePath("/");
  revalidatePath("/modules", "layout");
  revalidatePath("/modules/transport");
  revalidatePath(`/modules/transport/${vehicleId}`);
  revalidatePath(`/items/${vehicleId}`);
  if (serviceId) {
    revalidatePath(`/modules/transport/${vehicleId}/services/${serviceId}`);
    revalidatePath(`/items/${serviceId}`);
  }
}

async function uploadVehicleImage(
  workspaceId: string,
  vehicleId: string,
  file: File,
) {
  if (!IMAGE_TYPES.has(file.type)) {
    throw new Error("Povolené formáty: JPG, PNG, WebP alebo GIF");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Obrázok môže mať max. 5 MB");
  }

  const blob = await putPrivateBlob(
    `workspaces/${workspaceId}/vehicles/${vehicleId}/${Date.now()}-${file.name}`,
    file,
  );
  return blob.url;
}

export async function saveVehicleAction(formData: FormData) {
  const workspaceId = z.string().parse(formData.get("workspaceId"));
  const moduleId = z.string().parse(formData.get("moduleId"));
  const name = z.string().trim().min(1).max(160).parse(formData.get("name"));
  const idRaw = formData.get("id");
  const existingId =
    idRaw && String(idRaw).length > 0 ? String(idRaw) : null;
  const removeImage = formData.get("removeImage") === "1";
  const file = formData.get("image");

  const user = await ensureDbUser();
  await requireWorkspaceAccess(workspaceId, user.id);

  const typeDef = getItemTypeDefinition("transport", "vehicle");
  if (!typeDef) throw new Error("Neplatný typ vozidla");

  const attributes = parseAttributes(typeDef, {
    vehicleCategory: formData.get("attr_vehicleCategory") || "car",
    brand: formData.get("attr_brand") || "",
    model: formData.get("attr_model") || "",
    year: formData.get("attr_year") || "",
    licensePlate: formData.get("attr_licensePlate") || "",
    vin: formData.get("attr_vin") || "",
  });
  const color = parseItemColor(formData.get("attr_color"));

  if (existingId) {
    const existing = await db.query.items.findFirst({
      where: and(
        eq(items.id, existingId),
        eq(items.workspaceId, workspaceId),
        eq(items.type, "vehicle"),
      ),
    });
    if (!existing) throw new Error("Vozidlo neexistuje");

    const previous = (existing.attributes ?? {}) as Record<string, unknown>;
    const nextAttrs: Record<string, unknown> = {
      ...previous,
      ...attributes,
    };
    if (color) nextAttrs.color = color;

    if (removeImage && typeof previous.imageUrl === "string") {
      await deletePrivateBlob(previous.imageUrl);
      delete nextAttrs.imageUrl;
    }

    if (file instanceof File && file.size > 0) {
      if (typeof previous.imageUrl === "string") {
        await deletePrivateBlob(previous.imageUrl);
      }
      nextAttrs.imageUrl = await uploadVehicleImage(
        workspaceId,
        existingId,
        file,
      );
    }

    await db
      .update(items)
      .set({
        name,
        attributes: nextAttrs,
        updatedAt: new Date(),
      })
      .where(and(eq(items.id, existingId), eq(items.workspaceId, workspaceId)));

    revalidateVehicle(existingId);
    return { id: existingId };
  }

  const vehicleId = createId("itm");
  const createAttrs: Record<string, unknown> = { ...attributes };
  if (color) createAttrs.color = color;

  if (file instanceof File && file.size > 0) {
    createAttrs.imageUrl = await uploadVehicleImage(
      workspaceId,
      vehicleId,
      file,
    );
  }

  const [maxRow] = await db
    .select({ value: max(items.sortOrder) })
    .from(items)
    .where(
      and(
        eq(items.workspaceId, workspaceId),
        eq(items.moduleId, moduleId),
        eq(items.type, "vehicle"),
      ),
    );
  const nextOrder = (maxRow?.value ?? -1) + 1;

  await db.insert(items).values({
    id: vehicleId,
    workspaceId,
    moduleId,
    type: "vehicle",
    name,
    status: "active",
    sortOrder: nextOrder,
    attributes: createAttrs,
  });

  revalidateVehicle(vehicleId);
  return { id: vehicleId };
}

export async function reorderVehiclesAction(
  workspaceId: string,
  orderedIds: string[],
) {
  const parsedWorkspaceId = z.string().min(1).parse(workspaceId);
  const ids = z.array(z.string().min(1)).min(1).parse(orderedIds);

  const user = await ensureDbUser();
  await requireWorkspaceAccess(parsedWorkspaceId, user.id);

  const existing = await db.query.items.findMany({
    where: and(
      eq(items.workspaceId, parsedWorkspaceId),
      eq(items.type, "vehicle"),
      inArray(items.id, ids),
    ),
    columns: { id: true },
  });
  if (existing.length !== ids.length) {
    throw new Error("Neplatné poradie vozidiel");
  }

  const now = new Date();
  await Promise.all(
    ids.map((id, index) =>
      db
        .update(items)
        .set({ sortOrder: index, updatedAt: now })
        .where(
          and(eq(items.id, id), eq(items.workspaceId, parsedWorkspaceId)),
        ),
    ),
  );

  revalidatePath("/modules/transport");
  revalidatePath("/modules", "layout");
}

export async function configureVehicleServiceAction(formData: FormData) {
  const workspaceId = z.string().parse(formData.get("workspaceId"));
  const moduleId = z.string().parse(formData.get("moduleId"));
  const vehicleId = z.string().parse(formData.get("vehicleId"));
  const name = z.string().trim().min(1).max(160).parse(formData.get("name"));
  const serviceType = z
    .string()
    .min(1)
    .parse(formData.get("serviceType") || "other");

  const user = await ensureDbUser();
  await requireWorkspaceAccess(workspaceId, user.id);

  const vehicle = await db.query.items.findFirst({
    where: and(
      eq(items.id, vehicleId),
      eq(items.workspaceId, workspaceId),
      eq(items.type, "vehicle"),
    ),
  });
  if (!vehicle) throw new Error("Vozidlo neexistuje");

  const typeDef = getItemTypeDefinition("transport", "vehicle_service");
  if (!typeDef) throw new Error("Neplatný typ služby");

  const vendorIdRaw = String(formData.get("vendorId") || "").trim();
  const vendorId = vendorIdRaw
    ? (await assertVendorAccessible(vendorIdRaw, workspaceId)).id
    : null;

  const attributes = parseAttributes(typeDef, {
    serviceType,
    contractNumber: formData.get("contractNumber") || "",
    customerNumber: formData.get("customerNumber") || "",
    notes: formData.get("notes") || "",
  });

  const [service] = await db
    .insert(items)
    .values({
      id: createId("itm"),
      workspaceId,
      moduleId,
      type: "vehicle_service",
      name,
      status: "active",
      vendorId,
      attributes,
    })
    .returning();

  await db.insert(itemRelations).values({
    id: createId("irl"),
    workspaceId,
    sourceItemId: service.id,
    targetItemId: vehicleId,
    relationType: "belongs_to",
  });

  revalidateVehicle(vehicleId, service.id);
  return { id: service.id };
}

export async function hideVehicleServiceTypeAction(
  workspaceId: string,
  vehicleId: string,
  serviceType: string,
) {
  const user = await ensureDbUser();
  await requireWorkspaceAccess(workspaceId, user.id);

  const vehicle = await db.query.items.findFirst({
    where: and(
      eq(items.id, vehicleId),
      eq(items.workspaceId, workspaceId),
      eq(items.type, "vehicle"),
    ),
  });
  if (!vehicle) throw new Error("Vozidlo neexistuje");

  const attrs = (vehicle.attributes ?? {}) as Record<string, unknown>;
  const hidden = new Set(parseHiddenVehicleServiceTypes(attrs));
  hidden.add(serviceType);

  await db
    .update(items)
    .set({
      attributes: { ...attrs, hiddenServiceTypes: [...hidden] },
      updatedAt: new Date(),
    })
    .where(and(eq(items.id, vehicleId), eq(items.workspaceId, workspaceId)));

  revalidateVehicle(vehicleId);
}

export async function updateVehicleServiceAction(formData: FormData) {
  const workspaceId = z.string().parse(formData.get("workspaceId"));
  const serviceId = z.string().parse(formData.get("id"));
  const name = z.string().trim().min(1).max(160).parse(formData.get("name"));

  const user = await ensureDbUser();
  await requireWorkspaceAccess(workspaceId, user.id);

  const service = await db.query.items.findFirst({
    where: and(eq(items.id, serviceId), eq(items.workspaceId, workspaceId)),
  });
  if (!service || service.type !== "vehicle_service") {
    throw new Error("Služba neexistuje");
  }

  const typeDef = getItemTypeDefinition("transport", "vehicle_service");
  if (!typeDef) throw new Error("Neplatný typ služby");

  const existing = (service.attributes ?? {}) as Record<string, unknown>;
  const vendorIdRaw = String(formData.get("vendorId") || "").trim();
  const vendorId = vendorIdRaw
    ? (await assertVendorAccessible(vendorIdRaw, workspaceId)).id
    : null;

  const parsed = parseAttributes(typeDef, {
    serviceType: formData.get("serviceType") || existing.serviceType || "other",
    contractNumber: formData.get("contractNumber") || "",
    customerNumber: formData.get("customerNumber") || "",
    notes: formData.get("notes") || "",
  });
  delete parsed.provider;
  const color = parseItemColor(formData.get("attr_color"));
  const attributes: Record<string, unknown> = {
    ...existing,
    ...parsed,
  };
  if (color) attributes.color = color;
  delete attributes.provider;

  await db
    .update(items)
    .set({
      name,
      vendorId,
      attributes,
      updatedAt: new Date(),
    })
    .where(and(eq(items.id, serviceId), eq(items.workspaceId, workspaceId)));

  const parent = await db.query.itemRelations.findFirst({
    where: and(
      eq(itemRelations.sourceItemId, serviceId),
      eq(itemRelations.relationType, "belongs_to"),
    ),
  });

  revalidateVehicle(parent?.targetItemId ?? serviceId, serviceId);
}
