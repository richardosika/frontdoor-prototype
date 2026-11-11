import type { BidField } from "@/lib/bid-templates";
import { isVerifiedGc } from "@/lib/bid-plans";
import { prisma } from "@/lib/prisma";
import { isSubcontractor } from "@/lib/trades";
import { openPackagesFor } from "@/lib/trades-db";
import { circleIds, projectAudience } from "@/lib/project-contact-db";
import { allowedRecipients, canRequestBids, parseJson } from "@/lib/bids";
import { coverageSummary, normalizeCoverage } from "@/lib/insurance";
import { ALL_TEMPLATE_SEEDS } from "@/lib/bid-templates";
import { sendEmail } from "@/lib/email";
import { isLocale } from "@/lib/i18n/messages";
import { phrase } from "@/lib/i18n/phrases";
import { notify } from "@/lib/notify";
import { appBaseUrl } from "@/lib/url";

/** Who may request bids on this project, and whom they may ask. */
export async function bidAccess(projectId: string, viewerId: string) {
  const project = await prisma.trackProject.findUnique({ where: { id: projectId }, select: { id: true, name: true, userId: true, reviewStatus: true } });
  if (!project || project.reviewStatus !== "APPROVED") return null;
  const audience = await projectAudience(projectId);
  if (!canRequestBids({ viewerId, ownerId: project.userId, audience })) return null;
  const connections = [...(await circleIds(viewerId))];
  const allowed = allowedRecipients({ requesterId: viewerId, ownerId: project.userId, audience, connections });
  return { project, allowed, onProject: new Set([project.userId, ...audience]) };
}

/** Insurance and license, auto-filled from the bidder's verified profile. */
export function profileFacts(user: { insuranceCoverage: unknown; insuranceInfo: string; credentialNote: string }, tx: (s: string) => string = (s) => s) {
  const cov = coverageSummary(normalizeCoverage(user.insuranceCoverage), tx);
  return { insurance: cov || user.insuranceInfo || "", license: user.credentialNote || "" };
}

export async function approvedTemplates() {
  const rows = await prisma.bidTemplate.findMany({ where: { status: "APPROVED" }, orderBy: [{ name: "asc" }, { version: "desc" }] });
  const seen = new Set<string>();
  return rows.filter((r) => (seen.has(r.category) ? false : (seen.add(r.category), true)));
}

/** Seed one approved template per category (idempotent: an existing category version is left alone). */
export async function ensureBidTemplates() {
  for (const t of ALL_TEMPLATE_SEEDS) {
    await prisma.bidTemplate.upsert({
      where: { category_version: { category: t.category, version: t.version } },
      update: {},
      create: { category: t.category, name: t.name, version: t.version, fields: JSON.stringify(t.fields), status: "APPROVED", approvedAt: new Date(), approvedBy: "Private Floor staff (seed)" },
    });
  }
}

export type BidMailKind = "trade" | "request" | "submitted" | "shortlisted" | "awarded" | "notSelected" | "declined" | "question" | "answered";

const COPY: Record<BidMailKind, { subject: string; body: string }> = {
  trade: { subject: "New trade bid package: {trade} · {project}", body: "{name} posted a {trade} bid package on {project}. Bids are due {due}. It reached you because you list this trade and serve this area." },
  request: { subject: "New request for a proposal: {project}", body: "{name} asked you for a proposal on {project}. Proposals are due {due}. Only members already on this project can see this request." },
  submitted: { subject: "Proposal received: {project}", body: "{name} submitted a proposal on {project}. Open the comparison to review it side by side." },
  shortlisted: { subject: "You're on the shortlist: {project}", body: "{name} shortlisted your proposal on {project}. They may reach out with questions." },
  awarded: { subject: "Your proposal was selected: {project}", body: "Congratulations. {name} selected your proposal on {project}. The project now shows as Active in your Active Pipeline." },
  notSelected: { subject: "Update on your proposal: {project}", body: "Thank you for your proposal on {project}. {name} has chosen another proposal this time. We appreciate the care you put into it and hope to see you on the next one." },
  declined: { subject: "Update on your proposal: {project}", body: "Thank you for your proposal on {project}. {name} will not be moving forward with it. We appreciate your time." },
  question: { subject: "New question on your bid request: {project}", body: "{name} asked a question about your bid request on {project}. Open the request to answer it." },
  answered: { subject: "Your question was answered: {project}", body: "{name} answered your question about the bid request on {project}." },
};

/** Nov 5: a copy of the estimate the bidder just submitted, as an alert and a branded email. */
export async function estimateCopy(to: { id: string; email: string; locale: string; name: string }, project: string, fields: BidField[], values: Record<string, unknown>, href: string) {
  const locale = isLocale(to.locale) ? to.locale : "en";
  const p = (s: string) => phrase(locale, s);
  const lines = fields
    .filter((f) => f.type !== "profile")
    .map((f) => {
      const v = values[f.key];
      const shown = Array.isArray(v) ? v.map((x) => p(String(x))).join(", ") : v === undefined || v === null ? "" : String(v);
      if (!shown.trim()) return "";
      const money = f.type === "money" && /^\d+(\.\d+)?$/.test(shown) ? `$${Number(shown).toLocaleString("en-US")}` : shown;
      return `${p(f.label)}: ${f.type === "yesno" ? p(shown === "yes" ? "Yes" : "No") : money}`;
    })
    .filter(Boolean);
  const subject = fill(p("Copy of your estimate: {project}"), { project });
  const body = fill(p("Here is a copy of the estimate you submitted on {project}. Only the requester can see your numbers."), { project });
  await notify(to.id, { title: subject, body, href });
  await sendEmail({ to: to.email, subject, text: `${body}\n\n${lines.join("\n")}\n\n${p("Open in Private Floor")}\n${await appBaseUrl()}${href}` });
}

const fill = (s: string, vars: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");

/** Alert + branded email (test mode: the Outbox delivers only to the test recipient). */
export async function bidNotice(to: { id: string; email: string; locale: string }, kind: BidMailKind, vars: { name: string; project: string; due?: string; trade?: string }, href: string) {
  const locale = isLocale(to.locale) ? to.locale : "en";
  const c = COPY[kind];
  if (vars.trade) vars = { ...vars, trade: phrase(locale, vars.trade) };
  const subject = fill(phrase(locale, c.subject), vars as Record<string, string>);
  const body = fill(phrase(locale, c.body), vars as Record<string, string>);
  await notify(to.id, { title: subject, body, href });
  await sendEmail({ to: to.email, subject, text: `${body}\n\n${phrase(locale, "Open in Private Floor")}\n${await appBaseUrl()}${href}` });
}

/** For the Bids page: requests received, bids sent, bids requested. */
export async function loadBidsHome(userId: string) {
  const [received, requested] = await Promise.all([
    prisma.bidRecipient.findMany({
      where: { memberId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        request: {
          include: {
            project: { select: { id: true, name: true, location: true } },
            requester: { select: { id: true, name: true, org: true, role: true } },
            template: { select: { name: true, version: true } },
            bids: { where: { bidderId: userId }, select: { id: true, status: true, submittedAt: true } },
          },
        },
      },
    }),
    prisma.bidRequest.findMany({
      where: { requesterId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        project: { select: { id: true, name: true, location: true } },
        template: { select: { name: true, version: true } },
        _count: { select: { recipients: true } },
        bids: { where: { status: { not: "DRAFT" } }, select: { id: true, status: true } },
      },
    }),
  ]);
  // General-contractor requests are open to every verified GC.
  const viewer = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, status: true, paymentStatus: true, extraCategories: true, trades: true, markets: true, location: true } });
  const receivedIds = new Set(received.map((r) => r.request.id));
  const open = viewer && isVerifiedGc(viewer)
    ? (
        await prisma.bidRequest.findMany({
          where: { status: "OPEN", dueAt: { gt: new Date() }, requesterId: { not: userId }, template: { category: "GENERAL_CONTRACTOR" } },
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            project: { select: { id: true, name: true, location: true } },
            requester: { select: { id: true, name: true, org: true, role: true } },
            template: { select: { name: true, version: true } },
            _count: { select: { plans: true } },
          },
        })
      ).filter((r) => !receivedIds.has(r.id))
    : [];
  // Nov 6: trade bid packages open to this subcontractor (their trade, their area) that they were not sent directly.
  const trade = viewer && viewer.status === "ACTIVE" && ["PAID", "WAIVED", "NOT_REQUIRED"].includes(viewer.paymentStatus) && isSubcontractor(viewer)
    ? (await openPackagesFor(viewer)).filter((r) => !receivedIds.has(r.id))
    : [];
  const toDo = received.filter((r) => !r.request.bids.length || r.request.bids[0].status === "DRAFT");
  const sent = received.filter((r) => r.request.bids.length && r.request.bids[0].status !== "DRAFT");
  return { toDo, sent, requested, open, trade };
}

export function parseQuestions(json: string): string[] {
  const v = parseJson<unknown>(json, []);
  return Array.isArray(v) ? v.map(String) : [];
}
