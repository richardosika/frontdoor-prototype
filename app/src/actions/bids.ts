"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { BID_PDF_MAX, canDecide, canEditBid, cleanQuestions, isPdf, missingFields, parseFields, readBidValues, ANSWER_MAX } from "@/lib/bids";
import { bidAccess, bidNotice, parseQuestions } from "@/lib/bids-db";
import type { BidField } from "@/lib/bid-templates";
import { PLAN_MAX_BYTES, PLAN_MAX_FILES, canOpenRequest, isOpenToGcs, planType, safePlanName } from "@/lib/bid-plans";

function go(path: string, key: "error" | "notice", text: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(text)}`);
}
function refresh() {
  revalidatePath("/bids");
  revalidatePath("/bids/[id]", "page");
  revalidatePath("/feed");
  revalidatePath("/alerts");
}
const dueLabel = (d: Date) => new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", dateStyle: "medium" }).format(d);

export async function createBidRequest(formData: FormData) {
  const user = await requireUser();
  const projectId = String(formData.get("projectId") || "");
  const back = `/bids/new?project=${encodeURIComponent(projectId)}`;
  const access = await bidAccess(projectId, user.id);
  if (!access) go("/bids", "error", "You can request bids only on projects you own or are active on.");
  const template = await prisma.bidTemplate.findFirst({ where: { id: String(formData.get("templateId") || ""), status: "APPROVED" } });
  if (!template) go(back, "error", "Choose an approved template.");
  const dueRaw = String(formData.get("dueAt") || "");
  const dueAt = /^\d{4}-\d{2}-\d{2}$/.test(dueRaw) ? new Date(`${dueRaw}T17:00:00-05:00`) : null;
  if (!dueAt || dueAt.getTime() < Date.now()) go(back, "error", "Pick a due date in the future.");
  const recipients = [...new Set(formData.getAll("recipient").map(String))].filter((id) => access.allowed.has(id));
  // General-contractor requests are open to every verified GC, so picking members is optional there.
  if (!recipients.length && !isOpenToGcs(template.category)) go(back, "error", "Select at least one member to send this request to.");
  const planFiles = formData.getAll("plans").filter((f): f is File => f instanceof File && f.size > 0);
  if (planFiles.length > PLAN_MAX_FILES) go(back, "error", "Attach up to 5 plan files.");
  const plans: { fileName: string; contentType: string; sizeBytes: number; bytes: Uint8Array<ArrayBuffer> }[] = [];
  for (const file of planFiles) {
    if (file.size > PLAN_MAX_BYTES) go(back, "error", "Each plan file can be up to 25 MB.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const contentType = planType(file.name, bytes);
    if (!contentType) go(back, "error", "Plans must be PDF, DWG, PNG, JPG or WebP files.");
    plans.push({ fileName: safePlanName(file.name), contentType, sizeBytes: file.size, bytes });
  }
  const questions = cleanQuestions(formData.getAll("question"));
  const int = (k: string) => {
    const n = Number(String(formData.get(k) || "").replace(/[,\s]/g, ""));
    return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
  };
  const request = await prisma.bidRequest.create({
    data: {
      projectId,
      requesterId: user.id,
      templateId: template.id,
      title: String(formData.get("title") || "").trim().slice(0, 140) || `${template.name} · ${access.project.name}`,
      dueAt,
      questions: JSON.stringify(questions),
      units: int("units"),
      squareFeet: int("squareFeet"),
      basisNote: String(formData.get("basisNote") || "").trim().slice(0, 300),
      recipients: { create: recipients.map((memberId) => ({ memberId })) },
      plans: { create: plans },
    },
  });
  const people = await prisma.user.findMany({ where: { id: { in: recipients }, status: "ACTIVE" }, select: { id: true, email: true, locale: true } });
  for (const p of people) await bidNotice(p, "request", { name: user.name, project: access.project.name, due: dueLabel(dueAt) }, `/bids/${request.id}`);
  if (isOpenToGcs(template.category)) {
    // Open request: an in-app alert to verified general contractors (picked members already got the email above).
    const gcs = await prisma.user.findMany({
      where: { role: "GENERAL_CONTRACTOR", status: "ACTIVE", paymentStatus: { in: ["PAID", "WAIVED", "NOT_REQUIRED"] }, id: { notIn: [user.id, ...recipients] } },
      select: { id: true },
      take: 500,
    });
    await prisma.notification.createMany({
      data: gcs.map((gc) => ({ userId: gc.id, title: "New bid request open to general contractors", body: `${access.project.name} · ${dueLabel(dueAt)}`, href: `/bids/${request.id}` })),
    }).catch(() => null);
  }
  refresh();
  go(`/bids/${request.id}`, "notice", "Request sent.");
}

async function loadForBidder(requestId: string, user: { id: string; role: string; status: string; paymentStatus: string }) {
  const req = await prisma.bidRequest.findUnique({
    where: { id: requestId },
    include: { template: true, project: { select: { name: true } }, requester: { select: { id: true, email: true, locale: true, name: true } }, bids: { where: { bidderId: user.id } }, recipients: { select: { memberId: true } } },
  });
  if (!req) return null;
  const access = canOpenRequest({ viewer: user, requesterId: req.requesterId, recipientIds: req.recipients.map((r) => r.memberId), templateCategory: req.template.category });
  if (access !== "recipient" && access !== "open") return null;
  // An open request: a verified GC who bids joins the recipients so the request shows on their Bids page.
  if (access === "open") await prisma.bidRecipient.upsert({ where: { requestId_memberId: { requestId, memberId: user.id } }, update: {}, create: { requestId, memberId: user.id } });
  return req;
}

export async function saveBid(formData: FormData) {
  const user = await requireUser();
  const requestId = String(formData.get("requestId") || "");
  const back = `/bids/${requestId}`;
  const req = await loadForBidder(requestId, user);
  if (!req) go("/bids", "error", "This request is not available.");
  const existing = req.bids[0];
  if (!canEditBid({ requestStatus: req.status, dueAt: req.dueAt, bidStatus: existing?.status })) go(back, "error", "This request is closed for changes.");
  const fields: BidField[] = parseFields(req.template.fields);
  const values = readBidValues(fields, formData);
  const questions = parseQuestions(req.questions);
  const answers = questions.map((_, i) => String(formData.get(`a${i + 1}`) || "").trim().slice(0, ANSWER_MAX));
  const submit = formData.get("intent") === "submit";
  const pdf: { pdfName?: string; pdfSize?: number; pdfBytes?: Uint8Array<ArrayBuffer> | null } = {};
  const file = formData.get("pdf");
  if (formData.get("removePdf") === "1") Object.assign(pdf, { pdfName: "", pdfSize: 0, pdfBytes: null });
  if (file instanceof File && file.size > 0) {
    if (file.size > BID_PDF_MAX) go(back, "error", "Attach a PDF up to 25 MB.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!isPdf(bytes)) go(back, "error", "Attach a PDF up to 25 MB.");
    Object.assign(pdf, { pdfName: file.name.replace(/[^\w .()-]/g, "_").slice(0, 160) || "bid.pdf", pdfSize: file.size, pdfBytes: bytes });
  }
  if (submit) {
    const missing = missingFields(fields, values, questions, answers);
    if (missing.length) {
      await prisma.bid.upsert({
        where: { requestId_bidderId: { requestId, bidderId: user.id } },
        update: { values: JSON.stringify(values), answers: JSON.stringify(answers), ...pdf },
        create: { requestId, bidderId: user.id, values: JSON.stringify(values), answers: JSON.stringify(answers), ...pdf },
      });
      go(back, "error", "Fill every required field before you submit. Your draft was saved.");
    }
  }
  const wasSubmitted = existing?.status === "SUBMITTED";
  const status = submit || wasSubmitted ? "SUBMITTED" : "DRAFT";
  await prisma.bid.upsert({
    where: { requestId_bidderId: { requestId, bidderId: user.id } },
    update: { values: JSON.stringify(values), answers: JSON.stringify(answers), status, ...(submit ? { submittedAt: new Date() } : {}), ...pdf },
    create: { requestId, bidderId: user.id, values: JSON.stringify(values), answers: JSON.stringify(answers), status, ...(submit ? { submittedAt: new Date() } : {}), ...pdf },
  });
  if (submit) await bidNotice(req.requester, "submitted", { name: user.name, project: req.project.name }, `/bids/${requestId}`);
  refresh();
  go(back, "notice", submit ? "Proposal submitted." : "Draft saved.");
}

export async function decideBid(formData: FormData) {
  const user = await requireUser();
  const bid = await prisma.bid.findUnique({
    where: { id: String(formData.get("bidId") || "") },
    include: { bidder: { select: { id: true, email: true, locale: true, name: true } }, request: { include: { project: { select: { id: true, name: true } }, template: { select: { category: true } } } } },
  });
  if (!bid || bid.request.requesterId !== user.id) go("/bids", "error", "This request is not available.");
  const back = `/bids/${bid.requestId}`;
  const decision = String(formData.get("decision") || "");
  if (!canDecide(bid.status, bid.request.status, decision)) go(back, "error", "That decision is not available.");
  const now = new Date();
  const vars = { name: user.name, project: bid.request.project.name };
  if (decision !== "AWARDED") {
    await prisma.bid.update({ where: { id: bid.id }, data: { status: decision, decidedAt: now } });
    await bidNotice(bid.bidder, decision === "SHORTLISTED" ? "shortlisted" : "declined", vars, back);
    refresh();
    go(back, "notice", decision === "SHORTLISTED" ? "Shortlisted." : "Declined.");
  }
  const others = await prisma.bid.findMany({
    where: { requestId: bid.requestId, id: { not: bid.id }, status: { in: ["SUBMITTED", "SHORTLISTED"] } },
    include: { bidder: { select: { id: true, email: true, locale: true } } },
  });
  await prisma.$transaction([
    prisma.bid.update({ where: { id: bid.id }, data: { status: "AWARDED", decidedAt: now } }),
    prisma.bid.updateMany({ where: { id: { in: others.map((o) => o.id) } }, data: { status: "NOT_SELECTED", decidedAt: now } }),
    prisma.bidRequest.update({ where: { id: bid.requestId }, data: { status: "AWARDED" } }),
  ]);
  // The winner is Active on the project ("My work right now") and the win counts as a deal won.
  const projectId = bid.request.projectId;
  const pair = await prisma.projectContact.findFirst({ where: { projectId, OR: [{ fromId: user.id, toId: bid.bidderId }, { fromId: bid.bidderId, toId: user.id }] } });
  if (pair) await prisma.projectContact.update({ where: { id: pair.id }, data: pair.status === "ACCEPTED" ? {} : { status: "ACCEPTED", decidedAt: now, note: "Awarded through Bids" } });
  else await prisma.projectContact.create({ data: { projectId, fromId: user.id, toId: bid.bidderId, category: bid.request.template.category, note: "Awarded through Bids", status: "ACCEPTED", decidedAt: now } });
  await bidNotice(bid.bidder, "awarded", vars, back);
  for (const o of others) await bidNotice(o.bidder, "notSelected", vars, `/bids/${bid.requestId}`);
  refresh();
  revalidatePath("/profile");
  go(back, "notice", "Awarded.");
}

/** Admin: a new draft version of a category's template. Fields are JSON (same shape as the seeds). */
export async function saveTemplateVersion(formData: FormData) {
  await requireAdmin();
  const category = String(formData.get("category") || "").trim();
  const name = String(formData.get("name") || "").trim().slice(0, 120);
  const fields = parseFields(String(formData.get("fields") || ""));
  if (!category || !name || !fields.length) go("/admin/bid-templates", "error", "Add a category, a name and at least one field (JSON).");
  const top = await prisma.bidTemplate.findFirst({ where: { category }, orderBy: { version: "desc" }, select: { version: true } });
  await prisma.bidTemplate.create({ data: { category, name, version: (top?.version ?? 0) + 1, fields: JSON.stringify(fields), status: "DRAFT" } });
  revalidatePath("/admin/bid-templates");
  go("/admin/bid-templates", "notice", "Draft version saved. Approve it to make it available.");
}

export async function setTemplateStatus(formData: FormData) {
  const admin = await requireAdmin();
  const t = await prisma.bidTemplate.findUnique({ where: { id: String(formData.get("id") || "") } });
  const status = String(formData.get("status") || "");
  if (!t || !["APPROVED", "RETIRED"].includes(status)) go("/admin/bid-templates", "error", "Template not found.");
  if (status === "APPROVED") {
    await prisma.$transaction([
      prisma.bidTemplate.updateMany({ where: { category: t.category, status: "APPROVED", id: { not: t.id } }, data: { status: "RETIRED" } }),
      prisma.bidTemplate.update({ where: { id: t.id }, data: { status, approvedAt: new Date(), approvedBy: admin.name } }),
    ]);
  } else await prisma.bidTemplate.update({ where: { id: t.id }, data: { status } });
  revalidatePath("/admin/bid-templates");
  go("/admin/bid-templates", "notice", status === "APPROVED" ? "Template approved." : "Template retired.");
}
