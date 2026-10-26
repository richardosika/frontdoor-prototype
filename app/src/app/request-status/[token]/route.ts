import { NextResponse } from "next/server";
import { expiredDocument } from "@/lib/http-document";
import { prisma } from "@/lib/prisma";
import { publicAbsoluteUrl, withRequestSearch } from "@/lib/public-origin";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const requestRow = await prisma.inviteRequest.findUnique({ where: { statusToken: token }, select: { id: true } });
  if (!requestRow) {
    return new Response(expiredDocument("status"), {
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
  const path = withRequestSearch(`/request-status/view/${encodeURIComponent(token)}`, request.url);
  return NextResponse.redirect(publicAbsoluteUrl(path, request.headers));
}
