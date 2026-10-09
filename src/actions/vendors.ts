"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { items, vendorCategories, vendors } from "@/db/schema";
import { ensureDbUser } from "@/lib/auth";
import { deletePrivateBlob, putPrivateBlob } from "@/lib/blob";
import { createId } from "@/lib/id";
import {
  getVendorById,
  listVendorsForWorkspace,
} from "@/lib/queries";
import { requireWorkspaceAccess } from "@/lib/workspace";
import { isVendorCategoryKey } from "@/modules/vendor-categories";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const LOGO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function slugifyName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function revalidateVendors() {
  revalidatePath("/vendors");
  revalidatePath("/modules/household");
  revalidatePath("/modules", "layout");
}

function parseCategoryKeys(formData: FormData): string[] {
  const raw = formData.getAll("categoryKeys").map(String);
  const single = String(formData.get("categoryKey") || "").trim();
  const keys = [...raw, ...(single ? [single] : [])];
  return [...new Set(keys.filter(isVendorCategoryKey))];
}

async function uniqueVendorName(params: {
  displayName: string;
  scope: "global" | "custom";
  workspaceId: string | null;
  excludeId?: string;
}) {
  const nameBase = slugifyName(params.displayName) || "dodavatel";
  let name = nameBase;
  let attempt = 0;
  while (attempt < 12) {
    const clash = await db.query.vendors.findFirst({
      where: and(
        eq(vendors.scope, params.scope),
        params.scope === "custom"
          ? eq(vendors.workspaceId, params.workspaceId!)
          : undefined,
        eq(vendors.name, name),
      ),
      columns: { id: true },
    });
    if (!clash || clash.id === params.excludeId) break;
    attempt += 1;
    name = `${nameBase}-${attempt + 1}`;
  }
  return name;
}

async function uploadVendorLogo(
  workspaceId: string,
  vendorId: string,
  file: File,
) {
  if (!LOGO_TYPES.has(file.type)) {
    throw new Error("Povolené formáty loga: JPG, PNG, WebP alebo GIF");
  }
  if (file.size > MAX_LOGO_BYTES) {
    throw new Error("Logo môže mať max. 2 MB");
  }
  const blob = await putPrivateBlob(
    `workspaces/${workspaceId}/vendors/${vendorId}/${Date.now()}-${file.name}`,
    file,
  );
  return blob.url;
}

async function syncVendorCategories(vendorId: string, categoryKeys: string[]) {
  const existing = await db
    .select({ id: vendorCategories.id, categoryKey: vendorCategories.categoryKey })
    .from(vendorCategories)
    .where(eq(vendorCategories.vendorId, vendorId));

  const next = new Set(categoryKeys);
  const toDelete = existing.filter((c) => !next.has(c.categoryKey));
  if (toDelete.length > 0) {
    await db
      .delete(vendorCategories)
      .where(inArray(vendorCategories.id, toDelete.map((c) => c.id)));
  }

  const existingKeys = new Set(existing.map((c) => c.categoryKey));
  for (const key of categoryKeys) {
    if (existingKeys.has(key)) continue;
    await db.insert(vendorCategories).values({
      id: createId("vcat"),
      vendorId,
      categoryKey: key,
    });
  }
}

export async function searchVendorsAction(input: {
  workspaceId: string;
  categoryKey?: string | null;
  query?: string;
}) {
  const workspaceId = z.string().min(1).parse(input.workspaceId);
  const user = await ensureDbUser();
  await requireWorkspaceAccess(workspaceId, user.id);

  return listVendorsForWorkspace(workspaceId, {
    categoryKey: input.categoryKey,
    query: input.query,
  });
}

/** Create workspace-scoped custom vendor (used by VendorSelector quick-add). */
export async function createCustomVendorAction(formData: FormData) {
  formData.set("scope", "custom");
  return saveVendorAction(formData);
}

export async function saveVendorAction(formData: FormData) {
  const workspaceId = z.string().min(1).parse(formData.get("workspaceId"));
  const displayName = z
    .string()
    .trim()
    .min(1)
    .max(160)
    .parse(formData.get("name"));
  const scope = z.enum(["global", "custom"]).parse(
    formData.get("scope") || "custom",
  );
  const idRaw = String(formData.get("id") || "").trim();
  const removeLogo = formData.get("removeLogo") === "1";
  const website = optionalString(formData.get("website"), 300);
  const email = optionalString(formData.get("email"), 200);
  const phone = optionalString(formData.get("phone"), 60);
  const address = optionalString(formData.get("address"), 300);
  const companyId = optionalString(formData.get("companyId"), 40);
  const categoryKeys = parseCategoryKeys(formData);
  const file = formData.get("logo");

  const user = await ensureDbUser();
  await requireWorkspaceAccess(workspaceId, user.id);

  if (idRaw) {
    const existing = await getVendorById(idRaw, workspaceId);
    if (!existing) throw new Error("Dodávateľ neexistuje alebo nie je dostupný");

    // Custom vendors are only editable by their workspace; global by any member.
    if (
      existing.scope === "custom" &&
      existing.workspaceId !== workspaceId
    ) {
      throw new Error("Nemáte oprávnenie upraviť tohto dodávateľa");
    }

    let logoUrl = existing.logoUrl;
    if (removeLogo && logoUrl) {
      await deletePrivateBlob(logoUrl);
      logoUrl = null;
    }
    if (file instanceof File && file.size > 0) {
      if (logoUrl) await deletePrivateBlob(logoUrl);
      // Store under acting workspace path even for global vendors.
      logoUrl = await uploadVendorLogo(workspaceId, existing.id, file);
    }

    const name = await uniqueVendorName({
      displayName,
      scope: existing.scope,
      workspaceId: existing.workspaceId,
      excludeId: existing.id,
    });

    await db
      .update(vendors)
      .set({
        name,
        displayName,
        website,
        email,
        phone,
        address,
        companyId,
        logoUrl,
        updatedAt: new Date(),
      })
      .where(eq(vendors.id, existing.id));

    await syncVendorCategories(existing.id, categoryKeys);
    revalidateVendors();

    return {
      id: existing.id,
      name,
      displayName,
      logoUrl,
      website,
      email,
      phone,
      address,
      companyId,
      scope: existing.scope,
      categoryKeys,
    };
  }

  const vendorId = createId("vnd");
  const name = await uniqueVendorName({
    displayName,
    scope,
    workspaceId: scope === "custom" ? workspaceId : null,
  });

  let logoUrl: string | null = null;
  if (file instanceof File && file.size > 0) {
    logoUrl = await uploadVendorLogo(workspaceId, vendorId, file);
  }

  await db.insert(vendors).values({
    id: vendorId,
    name,
    displayName,
    logoUrl,
    website,
    email,
    phone,
    address,
    companyId,
    scope,
    workspaceId: scope === "custom" ? workspaceId : null,
    status: "active",
  });

  await syncVendorCategories(vendorId, categoryKeys);
  revalidateVendors();

  return {
    id: vendorId,
    name,
    displayName,
    logoUrl,
    website,
    email,
    phone,
    address,
    companyId,
    scope,
    categoryKeys,
  };
}

export async function deleteVendorAction(
  vendorId: string,
  workspaceId: string,
) {
  const parsedVendorId = z.string().min(1).parse(vendorId);
  const parsedWorkspaceId = z.string().min(1).parse(workspaceId);

  const user = await ensureDbUser();
  await requireWorkspaceAccess(parsedWorkspaceId, user.id);

  const vendor = await getVendorById(parsedVendorId, parsedWorkspaceId);
  if (!vendor) throw new Error("Dodávateľ neexistuje alebo nie je dostupný");

  if (vendor.scope === "custom" && vendor.workspaceId !== parsedWorkspaceId) {
    throw new Error("Nemáte oprávnenie zmazať tohto dodávateľa");
  }

  await db
    .update(vendors)
    .set({ status: "archived", updatedAt: new Date() })
    .where(eq(vendors.id, parsedVendorId));

  // Detach from active items so UI doesn't keep pointing at archived vendor.
  await db
    .update(items)
    .set({ vendorId: null, updatedAt: new Date() })
    .where(eq(items.vendorId, parsedVendorId));

  revalidateVendors();
}

export async function assertVendorAccessible(
  vendorId: string,
  workspaceId: string,
) {
  const vendor = await getVendorById(vendorId, workspaceId);
  if (!vendor) throw new Error("Dodávateľ neexistuje alebo nie je dostupný");
  return vendor;
}

function optionalString(value: FormDataEntryValue | null, max: number) {
  if (value == null || value === "") return null;
  const parsed = z.string().trim().max(max).safeParse(String(value));
  return parsed.success && parsed.data.length > 0 ? parsed.data : null;
}
