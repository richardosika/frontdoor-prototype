"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { MemberRole } from "@prisma/client";
import { requireUser } from "@/lib/current-user";
import { MARKETS } from "@/lib/domain";
import { isRoleId, roleLabel } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export async function createPost(formData: FormData) {
  const user = await requireUser();
  const kind = String(formData.get("kind") || "NORMAL");
  const body = String(formData.get("body") || "").trim();

  if (kind === "NORMAL") {
    if (body.length < 2) redirect("/feed?error=Write+a+short+update");
    await prisma.post.create({ data: { authorId: user.id, kind: "NORMAL", body } });
    revalidatePath("/feed");
    redirect("/feed");
  }

  if (kind !== "DEAL" && kind !== "SEEKING") redirect("/feed?error=Choose+a+post+type");

  const title = String(formData.get("title") || "").trim();
  const market = String(formData.get("market") || "");
  const sizeBand = String(formData.get("sizeBand") || "");
  const assetClass = String(formData.get("assetClass") || "").trim();
  const raiseLabel = String(formData.get("raiseLabel") || "").trim();
  const blurb = body || String(formData.get("blurb") || "").trim();
  const roleNeededRaw = String(formData.get("roleNeeded") || "");

  if (title.length < 3) redirect("/feed?error=Add+a+title");
  if (!(MARKETS as readonly string[]).includes(market)) redirect("/feed?error=Choose+a+market");
  if (!["under-1", "1-5", "5+"].includes(sizeBand)) redirect("/feed?error=Choose+a+size");
  if (!assetClass) redirect("/feed?error=Add+an+asset+class");
  if (!raiseLabel) redirect("/feed?error=Add+the+amount+or+size");
  if (kind === "SEEKING" && !isRoleId(roleNeededRaw)) redirect("/feed?error=Choose+the+role+you+need");

  const deal = await prisma.deal.create({
    data: {
      sponsorId: user.id,
      kind,
      title,
      blurb: blurb || title,
      market,
      sizeBand,
      assetClass,
      raiseLabel,
      targetIrr: String(formData.get("targetIrr") || "").trim(),
      minCheck: String(formData.get("minCheck") || "").trim(),
      equityMultiple: String(formData.get("equityMultiple") || "").trim(),
      deadline: String(formData.get("deadline") || "").trim(),
      roleNeeded: kind === "SEEKING" ? (roleNeededRaw as MemberRole) : null,
    },
  });

  const summary =
    kind === "DEAL"
      ? `Raising ${raiseLabel} — ${title}`
      : `Seeking ${roleLabel(roleNeededRaw)} — ${title}`;

  await prisma.post.create({
    data: {
      authorId: user.id,
      kind,
      body: blurb || summary,
      dealId: deal.id,
    },
  });

  revalidatePath("/feed");
  revalidatePath("/deals");
  redirect("/feed");
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
