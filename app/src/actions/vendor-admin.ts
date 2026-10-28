"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/current-user";
import { licenceRecheckOn } from "@/lib/platform/showcase";
import { prisma } from "@/lib/prisma";

export async function reviewLicence(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("licenceId") || "");
  const decision = String(formData.get("decision") || "");
  const licence = await prisma.license.findUnique({ where: { id }, include: { user: { select: { name: true } } } });
  if (!licence) redirect("/admin/licences");
  const now = new Date();
  if (decision === "VERIFIED") {
    await prisma.license.update({
      where: { id },
      data: { status: "VERIFIED", verifiedAt: now, recheckOn: licenceRecheckOn(now), verifiedById: admin.id },
    });
  } else if (decision === "NOT_FOUND" || decision === "REJECTED") {
    await prisma.license.update({
      where: { id },
      data: { status: decision, verifiedAt: null, recheckOn: null, verifiedById: admin.id },
    });
  } else {
    redirect("/admin/licences");
  }
  await prisma.moderationEvent.create({
    data: {
      actorId: admin.id,
      action: "LICENCE_REVIEW",
      targetUserId: licence.userId,
      targetType: "licence",
      summary: `${admin.name} marked a licence ${decision} for ${licence.user.name}.`,
    },
  });
  revalidatePath("/admin/licences");
  revalidatePath("/admin/audit");
  redirect("/admin/licences?notice=Licence+updated");
}

export async function reviewShowcase(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") || "");
  const decision = String(formData.get("decision") || "");
  if (decision !== "LISTED" && decision !== "HIDDEN") redirect("/admin/showcase");
  const profile = await prisma.vendorProfile.findUnique({ where: { userId }, include: { user: { select: { name: true } } } });
  if (!profile) redirect("/admin/showcase");
  await prisma.vendorProfile.update({
    where: { userId },
    data: { showcaseStatus: decision, reviewedAt: new Date(), reviewedById: admin.id },
  });
  await prisma.moderationEvent.create({
    data: {
      actorId: admin.id,
      action: "SHOWCASE_REVIEW",
      targetUserId: userId,
      targetType: "showcase",
      summary: `${admin.name} set the vendor showcase to ${decision} for ${profile.user.name}.`,
    },
  });
  revalidatePath("/admin/showcase");
  redirect("/admin/showcase?notice=Showcase+updated");
}

export async function approveShowcaseProject(formData: FormData) {
  const admin = await requireAdmin();
  const projectId = String(formData.get("projectId") || "");
  const project = await prisma.trackProject.findUnique({ where: { id: projectId }, include: { user: { select: { id: true, name: true } } } });
  if (!project) redirect("/admin/showcase");
  await prisma.trackProject.update({ where: { id: projectId }, data: { inShowcase: true, showcaseRequested: false } });
  await prisma.moderationEvent.create({
    data: {
      actorId: admin.id,
      action: "SHOWCASE_PROJECT",
      targetUserId: project.userId,
      targetType: "project",
      summary: `${admin.name} approved a showcase project for ${project.user.name}.`,
    },
  });
  revalidatePath("/admin/showcase");
  redirect("/admin/showcase?notice=Project+approved");
}

export async function verifyCredential(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("credentialId") || "");
  const row = await prisma.vendorCredential.findUnique({ where: { id }, include: { user: { select: { id: true, name: true } } } });
  if (!row) redirect("/admin/showcase");
  await prisma.vendorCredential.update({ where: { id }, data: { verifiedAt: new Date() } });
  await prisma.moderationEvent.create({
    data: {
      actorId: admin.id,
      action: "CREDENTIAL_REVIEW",
      targetUserId: row.userId,
      targetType: "credential",
      summary: `${admin.name} checked a credential for ${row.user.name}.`,
    },
  });
  revalidatePath("/admin/showcase");
  redirect("/admin/showcase?notice=Credential+checked");
}
