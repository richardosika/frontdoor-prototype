import { NextResponse } from "next/server";
import { expiredDocument } from "@/lib/http-document";
import { prisma } from "@/lib/prisma";
import { publicAbsoluteUrl } from "@/lib/public-origin";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const application = await prisma.application.findUnique({ where: { statusToken: token }, select: { id: true } });
  if (!application) {
    return new Response(expiredDocument("status"), {
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
  return NextResponse.redirect(publicAbsoluteUrl(`/apply/status/view/${encodeURIComponent(token)}`, request.headers));
}
