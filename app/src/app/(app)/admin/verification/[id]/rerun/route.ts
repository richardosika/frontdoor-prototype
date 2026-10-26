import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { verificationActor } from "@/lib/current-user";
import { runLivePrefill } from "@/lib/guided-prefill-db";
import { prisma } from "@/lib/prisma";
import { RERUN_STATUS, rerunChecksHref } from "@/lib/rerun-checks";
import { gateVerificationRequest } from "@/lib/verification";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * No-JS re-run. A server-action redirect after the checks were saved was coming
 * back as HTTP 500 on a plain form POST. This handler answers 303 See Other so
 * the browser continues with GET, and a failed re-run redirects with an error
 * instead of throwing.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await verificationActor();
  const denied = gateVerificationRequest({
    path: new URL(request.url).pathname,
    actor: actor ? { isAdmin: actor.isAdmin } : null,
  });
  if (denied) return denied;

  const { id } = await context.params;
  const existing = id ? await prisma.verificationCase.findUnique({ where: { id }, select: { id: true } }) : null;
  if (!existing) {
    return NextResponse.redirect(new URL(rerunChecksHref(id, "missing"), request.url), RERUN_STATUS);
  }
  try {
    await runLivePrefill(id);
  } catch (error) {
    console.error("re-run checks failed", id, error instanceof Error ? error.message : "error");
    return NextResponse.redirect(new URL(rerunChecksHref(id, "failed"), request.url), RERUN_STATUS);
  }
  revalidatePath(`/admin/verification/${id}`);
  revalidatePath("/admin/verification");
  const linked = await prisma.verificationCase.findUnique({ where: { id }, select: { applicationId: true } });
  if (linked?.applicationId) {
    revalidatePath(`/admin/applications/${linked.applicationId}`);
    revalidatePath("/admin/applications");
  }
  revalidatePath("/admin/audit");
  return NextResponse.redirect(new URL(rerunChecksHref(id, "done"), request.url), RERUN_STATUS);
}
