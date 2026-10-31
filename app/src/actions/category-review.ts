"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CATEGORY_APPROVED_TITLE, CATEGORY_DECLINED_TITLE, decideCategory } from "@/lib/category-review";
import { requireAdmin } from "@/lib/current-user";
import { sendEmail } from "@/lib/email";
import { isLocale } from "@/lib/i18n/messages";
import { phrase } from "@/lib/i18n/phrases";
import { notify } from "@/lib/notify";
import { prisma } from "@/lib/prisma";
import { seekLabel } from "@/lib/project-contact";
import { appBaseUrl } from "@/lib/url";

function back(kind: "error" | "notice", text: string): never {
  redirect(`/admin/categories?${kind}=${encodeURIComponent(text)}`);
}

/** #42 review: staff approve or decline one pending extra category for one member. */
export async function reviewMemberCategory(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") || "");
  const category = String(formData.get("category") || "");
  const decision = String(formData.get("decision") || "");
  const note = String(formData.get("note") || "").trim().slice(0, 400);
  const member = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, locale: true, extraCategories: true, pendingCategories: true, notifyProjectDecisions: true },
  });
  if (!member) back("error", "Member not found.");
  const result = decideCategory({ approved: member.extraCategories, pending: member.pendingCategories, category, decision, credentialChecked: formData.get("credentialChecked") === "on" });
  if (!result.ok) back("error", result.reason);
  await prisma.user.update({ where: { id: member.id }, data: { extraCategories: result.extraCategories, pendingCategories: result.pendingCategories } });
  await prisma.moderationEvent.create({
    data: { actorId: admin.id, action: "REVIEW_CATEGORY", summary: `${admin.name} ${result.approved ? "approved" : "declined"} ${seekLabel(category)} for ${member.name}.${note ? ` Note: ${note}` : ""}` },
  });
  const locale = isLocale(member.locale) ? member.locale : "en";
  const p = (text: string) => phrase(locale, text);
  const label = p(seekLabel(category));
  const title = `${p(result.approved ? CATEGORY_APPROVED_TITLE : CATEGORY_DECLINED_TITLE)}: ${label}`;
  const body = result.approved
    ? p("Developers looking for this category can now find you, and projects seeking it reach you.")
    : p("Staff could not confirm this category, so it is not on your profile. You can add the license or credential and ask again.");
  await notify(member.id, { title, body: note ? `${body} ${note}` : body, href: "/profile" });
  if (member.notifyProjectDecisions) {
    await sendEmail({ to: member.email, subject: title, text: `${body}${note ? `\n\n${note}` : ""}\n\n${p("Open your profile")}\n${await appBaseUrl()}/profile` });
  }
  if (result.approved) {
    const { alertNewMemberMatches } = await import("@/lib/member-alerts");
    await alertNewMemberMatches(member.id).catch(() => 0);
  }
  revalidatePath("/admin/categories");
  back("notice", `${member.name}: ${seekLabel(category)} ${result.approved ? "approved" : "declined"}.`);
}
