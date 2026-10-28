"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import { isStateCode } from "@/lib/platform/state-codes";
import { isVendorRole } from "@/lib/platform/showcase";
import { prisma } from "@/lib/prisma";

const KINDS = new Set(["CONTRACTOR", "BAR_ADMISSION", "BROKER", "MORTGAGE_ORIGINATOR", "DESIGN_PROFESSIONAL", "APPRAISER", "INSURANCE_PRODUCER", "CPA", "FACILITY_OPERATOR", "OTHER"]);
const AVAIL = new Set(["OPEN", "SELECTIVE", "BOOKED"]);

export async function saveVendorProfile(formData: FormData) {
  const user = await requireUser();
  if (!isVendorRole(user.role)) redirect("/profile");
  const availability = String(formData.get("availability") || "OPEN");
  const yearsRaw = String(formData.get("yearsInBusiness") || "");
  const years = yearsRaw === "" ? null : Number(yearsRaw);
  const existing = await prisma.vendorProfile.findUnique({ where: { userId: user.id }, select: { showcaseStatus: true } });
  const showcaseStatus = existing?.showcaseStatus === "LISTED" ? "LISTED" : "PENDING";
  const data = {
    headline: String(formData.get("headline") || "").trim().slice(0, 140),
    services: String(formData.get("services") || "").trim().slice(0, 800),
    projectSizeBand: String(formData.get("projectSizeBand") || "").slice(0, 40),
    yearsInBusiness: years != null && years >= 0 && years <= 80 ? years : null,
    availability: AVAIL.has(availability) ? (availability as "OPEN") : "OPEN",
    availabilityNote: String(formData.get("availabilityNote") || "").trim().slice(0, 240),
    acceptingRequests: formData.get("acceptingRequests") === "on",
    showcaseStatus,
  };
  await prisma.vendorProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...data },
    update: data,
  });
  revalidatePath("/vendors/edit");
  redirect("/vendors/edit?notice=Showcase+profile+saved.+A+Private+Floor+administrator+still+reviews+it.");
}

export async function addLicence(formData: FormData) {
  const user = await requireUser();
  if (!isVendorRole(user.role)) redirect("/profile");
  const stateCode = String(formData.get("stateCode") || "").toUpperCase();
  const kind = String(formData.get("kind") || "");
  if (!isStateCode(stateCode) || !KINDS.has(kind)) redirect("/vendors/edit?error=Choose+a+state+and+a+licence+type");
  await prisma.license.create({
    data: {
      userId: user.id,
      kind: kind as "OTHER",
      stateCode,
      scope: String(formData.get("scope") || "").trim().slice(0, 120),
      number: String(formData.get("number") || "").trim().slice(0, 80),
      expiresOn: dateOrNull(formData.get("expiresOn")),
      status: "SELF_REPORTED",
    },
  });
  revalidatePath("/vendors/edit");
  redirect("/vendors/edit?notice=Licence+saved+as+Listed+by+member");
}

export async function addCredential(formData: FormData) {
  const user = await requireUser();
  if (!isVendorRole(user.role)) redirect("/profile");
  const label = String(formData.get("label") || "").trim().slice(0, 120);
  if (label.length < 2) redirect("/vendors/edit?error=Name+the+credential");
  await prisma.vendorCredential.create({
    data: {
      userId: user.id,
      kind: String(formData.get("kind") || "CERTIFICATION").slice(0, 40),
      label,
      issuer: String(formData.get("issuer") || "").trim().slice(0, 120),
      expiresOn: dateOrNull(formData.get("expiresOn")),
    },
  });
  revalidatePath("/vendors/edit");
  redirect("/vendors/edit?notice=Credential+saved");
}

export async function requestProjectShowcase(formData: FormData) {
  const user = await requireUser();
  const projectId = String(formData.get("projectId") || "");
  const project = await prisma.trackProject.findUnique({ where: { id: projectId }, select: { userId: true } });
  if (!project || project.userId !== user.id) redirect("/profile");
  await prisma.trackProject.update({ where: { id: projectId }, data: { showcaseRequested: true } });
  revalidatePath("/profile");
  redirect("/profile?notice=Project+sent+for+showcase+review");
}

function dateOrNull(value: FormDataEntryValue | null): Date | null {
  const text = String(value || "");
  if (!text) return null;
  const date = new Date(`${text}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}
