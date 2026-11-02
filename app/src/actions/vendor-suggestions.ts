"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { deliverAdminNotice, vendorSuggestionAdminNotice } from "@/lib/admin-alerts";
import { requireAdmin, requireUser } from "@/lib/current-user";
import { withinRateLimit } from "@/lib/messaging";
import { prisma } from "@/lib/prisma";
import { seekLabel } from "@/lib/project-contact";
import { referralJoinLink } from "@/lib/referral-email";
import { appBaseUrl } from "@/lib/url";
import { RELATION_LABEL, validateSuggestion, type SuggestionInput } from "@/lib/vendor-suggestions";
import { SUGGESTION_CODE_NOTE, notifySuggestionStatus } from "@/lib/vendor-suggestions-db";

const DAY = 24 * 60 * 60 * 1000;
const SUGGESTIONS_PER_DAY = 20;

function mintCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const chunk = (size: number) => Array.from(randomBytes(size), (byte) => alphabet[byte % alphabet.length]).join("");
  return `PF-${chunk(4)}-${chunk(4)}`;
}

export type SuggestResult = { ok: true; id: string } | { ok: false; error: string };

/** Member: submit a private vendor suggestion. Staff get an email and an in-app alert. */
export async function submitVendorSuggestion(input: Partial<SuggestionInput>): Promise<SuggestResult> {
  const user = await requireUser();
  const checked = validateSuggestion(input);
  if (!checked.ok) return checked;
  const recent = await prisma.vendorSuggestion.count({ where: { suggestedById: user.id, createdAt: { gte: new Date(Date.now() - DAY) } } });
  if (!withinRateLimit(recent, SUGGESTIONS_PER_DAY)) return { ok: false, error: "You have sent many suggestions today. Try again tomorrow." };
  const v = checked.value;
  const row = await prisma.vendorSuggestion.create({ data: { ...v, suggestedById: user.id } });
  const base = await appBaseUrl();
  after(async () => {
    await deliverAdminNotice(
      vendorSuggestionAdminNotice({
        base,
        suggestionId: row.id,
        memberName: user.name,
        vendor: v.vendorName,
        company: v.company,
        category: seekLabel(v.category),
        location: v.location,
        relation: RELATION_LABEL[v.relation],
        nameOk: v.nameOk,
        website: v.website,
        contact: v.contact,
        note: v.note,
      }),
      { templateKey: "admin_vendor_suggestion" },
    );
  });
  revalidatePath("/suggest");
  return { ok: true, id: row.id };
}

export type AdminSuggestionResult = { ok: true; link?: string } | { ok: false; error: string };

/** Admin: approve and create a one-use referral code credited to the suggesting member. Idempotent. */
export async function approveVendorSuggestion(id: string): Promise<AdminSuggestionResult> {
  const admin = await requireAdmin();
  const row = await prisma.vendorSuggestion.findUnique({ where: { id } });
  if (!row) return { ok: false, error: "That suggestion was not found." };
  const base = await appBaseUrl();
  if (row.inviteCodeId) {
    const existing = await prisma.inviteCode.findUnique({ where: { id: row.inviteCodeId } });
    if (existing) return { ok: true, link: referralJoinLink(base, existing.code) };
  }
  if (row.status !== "IN_REVIEW") return { ok: false, error: "Only suggestions in review can be approved." };
  if (row.relation === "LOOKING" && !row.vendorName && !row.company) return { ok: false, error: "No vendor was named. This one is counted as demand." };
  let code = "";
  let codeId = "";
  for (let attempt = 0; attempt < 4 && !code; attempt += 1) {
    const candidate = mintCode();
    try {
      const created = await prisma.inviteCode.create({
        data: {
          code: candidate,
          maxUses: 1,
          createdById: row.suggestedById,
          referredName: row.vendorName || row.company,
          note: `${SUGGESTION_CODE_NOTE} ${row.id}: ${row.vendorName || row.company}`.slice(0, 300),
        },
      });
      code = candidate;
      codeId = created.id;
    } catch {
      // collision; try another code
    }
  }
  if (!code) return { ok: false, error: "Could not create a referral code. Try again." };
  const moved = await prisma.vendorSuggestion.updateMany({
    where: { id: row.id, status: "IN_REVIEW", inviteCodeId: null },
    data: { inviteCodeId: codeId, status: "LINK_SENT", reviewedAt: new Date(), reviewedById: admin.id, statusChangedAt: new Date() },
  });
  if (!moved.count) {
    await prisma.inviteCode.delete({ where: { id: codeId } }).catch(() => null);
    const again = await prisma.vendorSuggestion.findUnique({ where: { id: row.id } });
    const existing = again?.inviteCodeId ? await prisma.inviteCode.findUnique({ where: { id: again.inviteCodeId } }) : null;
    return existing ? { ok: true, link: referralJoinLink(base, existing.code) } : { ok: false, error: "That suggestion changed. Reload the page." };
  }
  await prisma.moderationEvent
    .create({ data: { actorId: admin.id, action: "VENDOR_SUGGESTION_APPROVED", summary: `Approved vendor suggestion ${row.vendorName || row.company} and created a referral link.` } })
    .catch(() => null);
  await notifySuggestionStatus(row.id, "LINK_SENT");
  revalidatePath("/admin/vendor-suggestions");
  return { ok: true, link: referralJoinLink(base, code) };
}

/** Admin: decline. The member is told; nothing is sent to the vendor. */
export async function declineVendorSuggestion(id: string): Promise<AdminSuggestionResult> {
  const admin = await requireAdmin();
  const moved = await prisma.vendorSuggestion.updateMany({
    where: { id, status: { in: ["IN_REVIEW", "LINK_SENT"] }, applicationId: null },
    data: { status: "DECLINED", reviewedAt: new Date(), reviewedById: admin.id, statusChangedAt: new Date() },
  });
  if (!moved.count) return { ok: false, error: "That suggestion can no longer be declined." };
  const row = await prisma.vendorSuggestion.findUnique({ where: { id } });
  if (row?.inviteCodeId) await prisma.inviteCode.update({ where: { id: row.inviteCodeId }, data: { expiresAt: new Date() } }).catch(() => null);
  await notifySuggestionStatus(id, "DECLINED");
  revalidatePath("/admin/vendor-suggestions");
  return { ok: true };
}
