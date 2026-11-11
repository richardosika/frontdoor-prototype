import { NextResponse, type NextRequest } from "next/server";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { getURLFromRedirectError } from "next/dist/client/components/redirect";
import { adminLoginAction, loginAction } from "@/actions/auth";
import { publicAbsoluteUrl } from "@/lib/public-origin";
import { signInErrorCode } from "@/lib/sign-in-fallback";

export const dynamic = "force-dynamic";

/** Build-independent sign-in post (see sign-in-fallback.ts). Always answers 303 so the browser follows with a GET. */
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const portal = formData.get("portal") === "admin" ? "admin" : "member";
  const next = String(formData.get("next") || "/feed");
  const back = (code: string) => {
    const path = portal === "admin" ? `/admin/login?error=${code}` : `/login?error=${code}&next=${encodeURIComponent(next)}`;
    return NextResponse.redirect(publicAbsoluteUrl(path, req.headers), 303);
  };
  try {
    const result = portal === "admin" ? await adminLoginAction(formData) : await loginAction(formData);
    if (result?.error) return back(signInErrorCode(result.error));
    return NextResponse.redirect(publicAbsoluteUrl(portal === "admin" ? "/admin" : "/feed", req.headers), 303);
  } catch (error) {
    if (isRedirectError(error)) {
      const target = new URL(getURLFromRedirectError(error), publicAbsoluteUrl("/", req.headers));
      return NextResponse.redirect(publicAbsoluteUrl(`${target.pathname}${target.search}`, req.headers), 303);
    }
    console.error("SIGN_IN_FALLBACK failed");
    return back("generic");
  }
}
