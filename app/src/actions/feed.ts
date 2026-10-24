"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { MemberRole } from "@prisma/client";
import { requireUser } from "@/lib/current-user";
import { SIZE_BANDS, storedSizeBand } from "@/lib/domain";
import { documentVersion, readLegalMarkdown } from "@/lib/legal";
import { US_STATES, flagPostLanguage, intentById, postNeedsRulesAck } from "@/lib/member-network";
import { notifyAdmins } from "@/lib/notify";
import { isRoleId, roleLabel } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export async function createPost(formData: FormData) {
  const user = await requireUser();
  const kind = String(formData.get("kind") || "NORMAL");
  const body = String(formData.get("body") || "").trim();

  if (kind === "NORMAL") {
    if (body.length < 2) redirect("/feed?error=Write+a+short+update");
    const flag = flagPostLanguage(body);
    await prisma.post.create({
      data: {
        authorId: user.id,
        kind: "NORMAL",
        body,
        status: flag ? "PENDING_REVIEW" : "PUBLISHED",
        flagReason: flag ?? "",
        isTest: user.isTest,
      },
    });
    if (flag) {
      await notifyAdmins({
        title: "Post held for review",
        body: `A post mentioned ${flag}.`,
        href: "/admin/moderation",
      });
      revalidatePath("/admin/moderation");
      redirect("/feed?notice=A+Private+Floor+administrator+will+review+this+before+it+is+published");
    }
    revalidatePath("/feed");
    redirect("/feed");
  }

  if (kind !== "DEAL" && kind !== "SEEKING") redirect("/feed?error=Choose+a+post+type");
  if (postNeedsRulesAck(kind) && formData.get("rulesAck") !== "yes") {
    redirect("/feed?error=Acknowledge+the+Seeking+and+Raising+rules+before+you+post");
  }
  const intent = intentById(String(formData.get("intent") || ""));
  if (!intent || intent.kind !== kind || !(intent.roles as readonly string[]).includes(user.role)) {
    redirect("/feed?error=Choose+a+post+that+matches+your+role");
  }
  const postKind = kind === "SEEKING" ? "SEEKING" : "DEAL";

  const title = String(formData.get("title") || "").trim();
  const market = String(formData.get("market") || "");
  const sizeBand = String(formData.get("sizeBand") || "");
  const assetClass = String(formData.get("assetClass") || "").trim();
  const raiseLabel = String(formData.get("raiseLabel") || "").trim();
  const blurb = body || String(formData.get("blurb") || "").trim();
  const roleNeededRaw = String(formData.get("roleNeeded") || "");

  if (title.length < 3) redirect("/feed?error=Add+a+title");
  if (!(US_STATES as readonly string[]).includes(market)) redirect("/feed?error=Choose+a+state");
  const band = storedSizeBand(postKind, sizeBand, raiseLabel);
  if (band !== "scope" && !SIZE_BANDS.some((item) => item.id === band)) redirect("/feed?error=Choose+a+size");
  if (!assetClass) redirect("/feed?error=Add+an+asset+class");
  if (!raiseLabel) redirect("/feed?error=Add+the+amount+or+size");
  if (roleNeededRaw && !isRoleId(roleNeededRaw)) redirect("/feed?error=Choose+the+role+you+need");
  const flag = flagPostLanguage(`${title}\n${blurb}\n${raiseLabel}\n${assetClass}`);
  const rulesVersion = documentVersion(readLegalMarkdown("seeking-raising.md"));
  const expiresRaw = String(formData.get("expiresAt") || "");
  const expiresAt = expiresRaw ? new Date(expiresRaw) : null;

  const deal = await prisma.deal.create({
    data: {
      sponsorId: user.id,
      kind: postKind,
      title,
      blurb: blurb || title,
      market,
      sizeBand: band,
      assetClass,
      raiseLabel,
      targetIrr: "",
      minCheck: "",
      equityMultiple: "",
      deadline: String(formData.get("deadline") || "").trim(),
      roleNeeded: isRoleId(roleNeededRaw) ? (roleNeededRaw as MemberRole) : null,
    },
  });

  const summary =
    kind === "DEAL"
      ? `Raising ${raiseLabel} — ${title}`
      : `Seeking ${roleLabel(roleNeededRaw)} — ${title}`;

  await prisma.post.create({
    data: {
      authorId: user.id,
      kind: postKind,
      title,
      intent: intent.id,
      body: blurb || summary,
      market,
      assetClass,
      sizeRange: raiseLabel,
      rulesVersion,
      rulesAckAt: new Date(),
      status: flag ? "PENDING_REVIEW" : "PUBLISHED",
      flagReason: flag ?? "",
      expiresAt: expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : null,
      dealId: deal.id,
      isTest: user.isTest,
    },
  });
  if (flag) {
    await notifyAdmins({
      title: "Post held for review",
      body: `${user.name}'s post mentioned ${flag} and is waiting for an administrator.`,
      href: "/admin/moderation",
    });
    revalidatePath("/admin/moderation");
    redirect("/feed?notice=Held+for+review.+It+is+not+published+until+a+Private+Floor+administrator+clears+it");
  }

  revalidatePath("/feed");
  revalidatePath("/deals");
  redirect("/feed?notice=Posted");
}

export async function closePost(formData: FormData) {
  const user = await requireUser();
  const postId = String(formData.get("postId") || "");
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post || post.authorId !== user.id) redirect("/feed");
  await prisma.post.update({ where: { id: postId }, data: { status: "CLOSED", closedAt: new Date() } });
  revalidatePath("/feed");
  revalidatePath("/deals");
  redirect("/feed?notice=Post+closed");
}

export async function updatePost(formData: FormData) {
  const user = await requireUser();
  const postId = String(formData.get("postId") || "");
  const body = String(formData.get("body") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post || post.authorId !== user.id) redirect("/feed");
  if (body.length < 2) redirect(`/deals/${post.dealId || ""}?error=Write+the+updated+post`);
  const flag = flagPostLanguage(`${title}\n${body}`);
  await prisma.post.update({
    where: { id: postId },
    data: {
      body,
      title: title || post.title,
      status: flag ? "PENDING_REVIEW" : "PUBLISHED",
      flagReason: flag ?? "",
      closedAt: null,
    },
  });
  if (post.dealId && title) {
    await prisma.deal.update({ where: { id: post.dealId }, data: { title, blurb: body } });
  }
  revalidatePath("/feed");
  revalidatePath("/deals");
  redirect(flag ? "/feed?notice=Updated+and+held+for+review" : "/feed?notice=Post+updated");
}

export async function markChecklist(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("item") || "");
  if (id !== "directory" && id !== "guidelines") redirect("/feed");
  const current = new Set(user.checklistDone.split(",").map((item) => item.trim()).filter(Boolean));
  current.add(id);
  await prisma.user.update({ where: { id: user.id }, data: { checklistDone: [...current].join(",") } });
  revalidatePath("/feed");
}

export async function dismissWelcome() {
  const user = await requireUser();
  await prisma.user.update({ where: { id: user.id }, data: { seenWelcome: true } });
  revalidatePath("/feed");
}

export async function toggleLike(formData: FormData) {
  const user = await requireUser();
  const postId = String(formData.get("postId") || "");
  const existing = await prisma.like.findUnique({
    where: { userId_postId: { userId: user.id, postId } },
  });
  if (existing) {
    await prisma.like.delete({ where: { userId_postId: { userId: user.id, postId } } });
  } else {
    await prisma.like.create({ data: { userId: user.id, postId } });
  }
  revalidatePath("/feed");
}

export async function addComment(formData: FormData) {
  const user = await requireUser();
  const postId = String(formData.get("postId") || "");
  const body = String(formData.get("body") || "").trim();
  if (body.length < 1 || body.length > 1000) redirect("/feed?error=Comment+must+be+1–1000+characters");
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) redirect("/feed");
  await prisma.comment.create({ data: { postId, authorId: user.id, body } });
  revalidatePath("/feed");
}
