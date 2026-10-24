import { headers } from "next/headers";

const BIND_HOST = /^(0\.0\.0\.0|127\.0\.0\.1|\[::1\]|\[::\])(?::\d+)?$/i;

export function isBindHost(host: string): boolean {
  const bare = host.trim().replace(/^https?:\/\//i, "").split("/")[0] || "";
  return BIND_HOST.test(bare);
}

/** Public origin for links. Never the process bind address. */
export function resolvePublicBase(input: {
  appUrl?: string | null;
  nextPublicAppUrl?: string | null;
  renderExternalUrl?: string | null;
  forwardedHost?: string | null;
  host?: string | null;
  proto?: string | null;
}): string {
  const configured = [input.appUrl, input.nextPublicAppUrl, input.renderExternalUrl];
  for (const candidate of configured) {
    const clean = (candidate || "").trim().replace(/\/$/, "");
    if (clean && !isBindHost(clean)) return clean;
  }
  const host = (input.forwardedHost || "").split(",")[0]?.trim() || (input.host || "").trim();
  if (host && !isBindHost(host)) {
    const proto = (input.proto || "https").split(",")[0]?.trim() || "https";
    return `${proto}://${host}`;
  }
  return "http://localhost:3000";
}

export async function appBaseUrl(): Promise<string> {
  const headerList = await headers();
  return resolvePublicBase({
    appUrl: process.env.APP_URL,
    nextPublicAppUrl: process.env.NEXT_PUBLIC_APP_URL,
    renderExternalUrl: process.env.RENDER_EXTERNAL_URL || process.env.AUTH_URL,
    forwardedHost: headerList.get("x-forwarded-host"),
    host: headerList.get("host"),
    proto: headerList.get("x-forwarded-proto"),
  });
}
