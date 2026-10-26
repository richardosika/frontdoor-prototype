import { NextResponse } from "next/server";
import { publicAbsoluteUrl, withRequestSearch } from "@/lib/public-origin";
import { publicStatusPath } from "@/lib/public-status";

export const dynamic = "force-dynamic";

/** Older letters used this path. The current letter uses /request-status. */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const path = withRequestSearch(publicStatusPath(token), request.url);
  return NextResponse.redirect(publicAbsoluteUrl(path, request.headers));
}
