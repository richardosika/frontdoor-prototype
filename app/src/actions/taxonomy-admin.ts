"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/current-user";
import { canAddField, slugifyLabel, FIELD_CAP } from "@/lib/platform/admin-taxonomy";
import { prisma } from "@/lib/prisma";
import type { MemberRole } from "@prisma/client";
import { ROLE_IDS } from "@/lib/roles";

async function audit(actorId: string, action: string, targetType: string, summary: string) {
  await prisma.moderationEvent.create({
    data: { actorId, action, targetType, summary },
  });
}

export async function saveAssetType(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") || "");
  const label = String(formData.get("label") || "").trim().slice(0, 80);
  const parentId = String(formData.get("parentId") || "") || null;
  if (label.length < 2) redirect("/admin/taxonomy?error=Name+the+asset+type");
  const slug = slugifyLabel(String(formData.get("slug") || label));
  if (!slug) redirect("/admin/taxonomy?error=Name+the+asset+type");
  if (id) {
    await prisma.assetType.update({ where: { id }, data: { label, parentId } });
    await audit(admin.id, "ASSET_TYPE", "asset", `${admin.name} updated asset type ${label}.`);
  } else {
    const taken = await prisma.assetType.findUnique({ where: { slug } });
    if (taken) redirect("/admin/taxonomy?error=That+asset+type+already+exists");
    const last = await prisma.assetType.aggregate({ _max: { sortOrder: true } });
    await prisma.assetType.create({ data: { slug, label, parentId, sortOrder: (last._max.sortOrder || 0) + 1 } });
    await audit(admin.id, "ASSET_TYPE", "asset", `${admin.name} added asset type ${label}.`);
  }
  revalidatePath("/admin/taxonomy");
  redirect("/admin/taxonomy?notice=Asset+type+saved");
}

export async function setAssetActive(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") || "");
  const active = formData.get("active") === "1";
  const row = await prisma.assetType.update({ where: { id }, data: { active } });
  await audit(admin.id, "ASSET_TYPE", "asset", `${admin.name} ${active ? "restored" : "retired"} asset type ${row.label}.`);
  revalidatePath("/admin/taxonomy");
  redirect("/admin/taxonomy?notice=Asset+type+updated");
}

export async function moveAssetType(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") || "");
  const direction = formData.get("direction") === "up" ? -1 : 1;
  const rows = await prisma.assetType.findMany({ orderBy: { sortOrder: "asc" } });
  const index = rows.findIndex((row) => row.id === id);
  const swap = rows[index + direction];
  const current = rows[index];
  if (!current || !swap) redirect("/admin/taxonomy");
  await prisma.$transaction([
    prisma.assetType.update({ where: { id: current.id }, data: { sortOrder: swap.sortOrder } }),
    prisma.assetType.update({ where: { id: swap.id }, data: { sortOrder: current.sortOrder } }),
  ]);
  await audit(admin.id, "ASSET_TYPE", "asset", `${admin.name} reordered asset type ${current.label}.`);
  revalidatePath("/admin/taxonomy");
  redirect("/admin/taxonomy");
}

export async function saveAssetField(formData: FormData) {
  const admin = await requireAdmin();
  const assetTypeId = String(formData.get("assetTypeId") || "") || null;
  const label = String(formData.get("label") || "").trim().slice(0, 80);
  const key = slugifyLabel(String(formData.get("key") || label));
  const kind = String(formData.get("kind") || "TEXT");
  const scope = String(formData.get("scope") || "PROFILE");
  if (!key || label.length < 2) redirect("/admin/taxonomy?error=Name+the+field");
  const activeCount = await prisma.assetField.count({ where: { assetTypeId, active: true } });
  const cap = canAddField(activeCount, FIELD_CAP);
  if (!cap.ok) redirect(`/admin/taxonomy?error=${encodeURIComponent(cap.reason)}`);
  const kinds = new Set(["TEXT", "NUMBER", "BOOLEAN", "SELECT", "MULTISELECT"]);
  const scopes = new Set(["PROFILE", "DEAL", "PROJECT", "VENDOR"]);
  await prisma.assetField.create({
    data: {
      assetTypeId,
      key,
      label,
      kind: (kinds.has(kind) ? kind : "TEXT") as "TEXT",
      scope: (scopes.has(scope) ? scope : "PROFILE") as "PROFILE",
      unit: String(formData.get("unit") || "").slice(0, 20),
      filterable: formData.get("filterable") === "on",
      audience: formData.get("audience") === "ADMIN" ? "ADMIN" : formData.get("audience") === "DEAL_TEAM" ? "DEAL_TEAM" : "MEMBERS",
      sortOrder: activeCount + 1,
    },
  });
  await audit(admin.id, "ASSET_FIELD", "field", `${admin.name} added field ${label}.`);
  revalidatePath("/admin/taxonomy");
  redirect("/admin/taxonomy?notice=Field+saved");
}

export async function setFieldActive(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") || "");
  const active = formData.get("active") === "1";
  const row = await prisma.assetField.update({ where: { id }, data: { active } });
  await audit(admin.id, "ASSET_FIELD", "field", `${admin.name} ${active ? "restored" : "retired"} field ${row.label}.`);
  revalidatePath("/admin/taxonomy");
  redirect("/admin/taxonomy?notice=Field+updated");
}

export async function saveMarketFlags(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") || "");
  const focus = formData.get("focus") === "on";
  const active = formData.get("active") === "on";
  const tier = formData.get("tier") === "ACTIVE" ? "ACTIVE" : "SEEDING";
  const row = await prisma.market.update({ where: { id }, data: { focus, active, tier } });
  await audit(admin.id, "MARKET", "market", `${admin.name} updated market ${row.name}.`);
  revalidatePath("/admin/markets");
  revalidatePath("/admin/readiness");
  redirect("/admin/markets?notice=Market+saved");
}

export async function saveSpecialty(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") || "");
  const label = String(formData.get("label") || "").trim().slice(0, 80);
  const slug = slugifyLabel(String(formData.get("slug") || label));
  const roles = formData
    .getAll("forRoles")
    .map(String)
    .filter((role): role is MemberRole => (ROLE_IDS as readonly string[]).includes(role));
  const assetTypeId = String(formData.get("assetTypeId") || "") || null;
  if (!slug || label.length < 2) redirect("/admin/specialties?error=Name+the+specialty");
  if (id) {
    await prisma.specialty.update({
      where: { id },
      data: { label, forRoles: roles, assetTypeId },
    });
  } else {
    const taken = await prisma.specialty.findUnique({ where: { slug } });
    if (taken) redirect("/admin/specialties?error=That+specialty+already+exists");
    await prisma.specialty.create({ data: { slug, label, forRoles: roles, assetTypeId } });
  }
  await audit(admin.id, "SPECIALTY", "specialty", `${admin.name} saved specialty ${label}.`);
  revalidatePath("/admin/specialties");
  redirect("/admin/specialties?notice=Specialty+saved");
}

export async function setSpecialtyActive(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") || "");
  const active = formData.get("active") === "1";
  const row = await prisma.specialty.update({ where: { id }, data: { active } });
  await audit(admin.id, "SPECIALTY", "specialty", `${admin.name} ${active ? "restored" : "retired"} specialty ${row.label}.`);
  revalidatePath("/admin/specialties");
  redirect("/admin/specialties?notice=Specialty+updated");
}
