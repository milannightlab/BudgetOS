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
import { parseHiddenServiceTypes } from "@/modules/property-services";
import { isModuleSlug } from "@/modules/registry";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function revalidateProperty(propertyId: string, serviceId?: string) {
  revalidatePath("/");
  revalidatePath("/modules", "layout");
  revalidatePath("/modules/household");
  revalidatePath(`/modules/household/${propertyId}`);
  revalidatePath(`/items/${propertyId}`);
  if (serviceId) {
    revalidatePath(`/modules/household/${propertyId}/services/${serviceId}`);
    revalidatePath(`/items/${serviceId}`);
  }
}

async function uploadPropertyImage(
  workspaceId: string,
  propertyId: string,
  file: File,
) {
  if (!IMAGE_TYPES.has(file.type)) {
    throw new Error("Povolené formáty: JPG, PNG, WebP alebo GIF");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Obrázok môže mať max. 5 MB");
  }

  const blob = await putPrivateBlob(
    `workspaces/${workspaceId}/properties/${propertyId}/${Date.now()}-${file.name}`,
    file,
  );
  return blob.url;
}

export async function savePropertyAction(formData: FormData) {
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

  const typeDef = getItemTypeDefinition("household", "property");
  if (!typeDef) throw new Error("Neplatný typ nehnuteľnosti");

  const attributes = parseAttributes(typeDef, {
    propertyType: formData.get("attr_propertyType") || "house",
    address: formData.get("attr_address") || "",
    relationshipType: formData.get("attr_relationshipType") || "",
  });
  const color = parseItemColor(formData.get("attr_color"));

  if (existingId) {
    const existing = await db.query.items.findFirst({
      where: and(
        eq(items.id, existingId),
        eq(items.workspaceId, workspaceId),
        eq(items.type, "property"),
      ),
    });
    if (!existing) throw new Error("Nehnuteľnosť neexistuje");

    const previous = (existing.attributes ?? {}) as Record<string, unknown>;
    const nextAttrs: Record<string, unknown> = {
      ...previous,
      ...attributes,
      hiddenServiceTypes: parseHiddenServiceTypes(previous),
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
      nextAttrs.imageUrl = await uploadPropertyImage(
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

    revalidateProperty(existingId);
    return { id: existingId };
  }

  const propertyId = createId("itm");
  const createAttrs: Record<string, unknown> = { ...attributes };
  if (color) createAttrs.color = color;

  if (file instanceof File && file.size > 0) {
    createAttrs.imageUrl = await uploadPropertyImage(
      workspaceId,
      propertyId,
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
        eq(items.type, "property"),
      ),
    );
  const nextOrder = (maxRow?.value ?? -1) + 1;

  await db.insert(items).values({
    id: propertyId,
    workspaceId,
    moduleId,
    type: "property",
    name,
    status: "active",
    sortOrder: nextOrder,
    attributes: createAttrs,
  });

  revalidateProperty(propertyId);
  return { id: propertyId };
}

export async function reorderPropertiesAction(
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
      eq(items.type, "property"),
      inArray(items.id, ids),
    ),
    columns: { id: true },
  });
  if (existing.length !== ids.length) {
    throw new Error("Neplatné poradie nehnuteľností");
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

  revalidatePath("/modules/household");
  revalidatePath("/modules", "layout");
}

export async function configurePropertyServiceAction(formData: FormData) {
  const workspaceId = z.string().parse(formData.get("workspaceId"));
  const moduleId = z.string().parse(formData.get("moduleId"));
  const propertyId = z.string().parse(formData.get("propertyId"));
  const name = z.string().trim().min(1).max(160).parse(formData.get("name"));
  const serviceType = z
    .string()
    .min(1)
    .parse(formData.get("serviceType") || "other");

  const user = await ensureDbUser();
  await requireWorkspaceAccess(workspaceId, user.id);

  const property = await db.query.items.findFirst({
    where: and(
      eq(items.id, propertyId),
      eq(items.workspaceId, workspaceId),
      eq(items.type, "property"),
    ),
    with: { module: true },
  });
  if (!property) throw new Error("Nehnuteľnosť neexistuje");
  if (!isModuleSlug(property.module.slug)) throw new Error("Neplatný modul");

  const typeDef = getItemTypeDefinition(property.module.slug, "property_service");
  if (!typeDef) throw new Error("Neplatný typ služby");

  const vendorIdRaw = String(formData.get("vendorId") || "").trim();
  const vendorId = vendorIdRaw
    ? (await assertVendorAccessible(vendorIdRaw, workspaceId)).id
    : null;

  const rawAttrs: Record<string, unknown> = {
    serviceType,
    contractNumber: formData.get("contractNumber") || "",
    customerNumber: formData.get("customerNumber") || "",
    notes: formData.get("notes") || "",
  };
  const attributes = parseAttributes(typeDef, rawAttrs);

  const [service] = await db
    .insert(items)
    .values({
      id: createId("itm"),
      workspaceId,
      moduleId,
      type: "property_service",
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
    targetItemId: propertyId,
    relationType: "belongs_to",
  });

  revalidateProperty(propertyId, service.id);
  return { id: service.id };
}

export async function hidePropertyServiceTypeAction(
  workspaceId: string,
  propertyId: string,
  serviceType: string,
) {
  const user = await ensureDbUser();
  await requireWorkspaceAccess(workspaceId, user.id);

  const property = await db.query.items.findFirst({
    where: and(
      eq(items.id, propertyId),
      eq(items.workspaceId, workspaceId),
      eq(items.type, "property"),
    ),
  });
  if (!property) throw new Error("Nehnuteľnosť neexistuje");

  const attrs = (property.attributes ?? {}) as Record<string, unknown>;
  const hidden = new Set(parseHiddenServiceTypes(attrs));
  hidden.add(serviceType);

  await db
    .update(items)
    .set({
      attributes: { ...attrs, hiddenServiceTypes: [...hidden] },
      updatedAt: new Date(),
    })
    .where(and(eq(items.id, propertyId), eq(items.workspaceId, workspaceId)));

  revalidateProperty(propertyId);
}

export async function updatePropertyServiceAction(formData: FormData) {
  const workspaceId = z.string().parse(formData.get("workspaceId"));
  const serviceId = z.string().parse(formData.get("id"));
  const name = z.string().trim().min(1).max(160).parse(formData.get("name"));

  const user = await ensureDbUser();
  await requireWorkspaceAccess(workspaceId, user.id);

  const service = await db.query.items.findFirst({
    where: and(
      eq(items.id, serviceId),
      eq(items.workspaceId, workspaceId),
    ),
    with: { module: true },
  });
  if (!service || service.type !== "property_service") {
    throw new Error("Služba neexistuje");
  }
  if (!isModuleSlug(service.module.slug)) throw new Error("Neplatný modul");

  const typeDef = getItemTypeDefinition(service.module.slug, "property_service");
  if (!typeDef) throw new Error("Neplatný typ služby");

  const existing = (service.attributes ?? {}) as Record<string, unknown>;
  const vendorIdRaw = String(formData.get("vendorId") || "").trim();
  const vendorId = vendorIdRaw
    ? (await assertVendorAccessible(vendorIdRaw, workspaceId)).id
    : null;

  const rawAttrs: Record<string, unknown> = {
    serviceType: formData.get("serviceType") || existing.serviceType || "other",
    contractNumber: formData.get("contractNumber") || "",
    customerNumber: formData.get("customerNumber") || "",
    notes: formData.get("notes") || "",
  };
  const parsed = parseAttributes(typeDef, rawAttrs);
  // Drop legacy free-text provider; vendor lives on items.vendorId.
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

  revalidateProperty(parent?.targetItemId ?? serviceId, serviceId);
}
