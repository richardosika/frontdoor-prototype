import { NextResponse } from "next/server";
import { expiredDocument } from "@/lib/http-document";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const member = await prisma.user.findUnique({ where: { paymentToken: token }, select: { status: true } });
  if (!member || member.status !== "ACTIVE") {
    return new Response(expiredDocument("payment"), {
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
  return NextResponse.redirect(new URL(`/pay/view/${encodeURIComponent(token)}`, request.url));
}
