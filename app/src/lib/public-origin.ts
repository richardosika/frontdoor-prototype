const BIND_HOST = /^(0\.0\.0\.0|127\.0\.0\.1|\[::1\]|\[::\])(?::\d+)?$/i;

export type PublicEnv = {
  APP_URL?: string;
  NEXT_PUBLIC_APP_URL?: string;
  RENDER_EXTERNAL_URL?: string;
  AUTH_URL?: string;
  NEXTAUTH_URL?: string;
};

type HeaderSource = { get(name: string): string | null };

export function isBindHost(host: string): boolean {
  const bare = host.trim().replace(/^https?:\/\//i, "").split("/")[0] || "";
  return BIND_HOST.test(bare);
}

/** Public origin for links. Never the process bind address. */
export function resolvePublicBase(input: {
  appUrl?: string | null;
  nextPublicAppUrl?: string | null;
  renderExternalUrl?: string | null;
  authUrl?: string | null;
  nextAuthUrl?: string | null;
  forwardedHost?: string | null;
  host?: string | null;
  proto?: string | null;
}): string {
  const configured = [input.appUrl, input.nextPublicAppUrl, input.renderExternalUrl, input.authUrl, input.nextAuthUrl];
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

function runtimePublicEnv(): PublicEnv {
  return {
    APP_URL: process.env.APP_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    RENDER_EXTERNAL_URL: process.env.RENDER_EXTERNAL_URL,
    AUTH_URL: process.env.AUTH_URL,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  };
}

export function publicOrigin(headerList: HeaderSource, env: PublicEnv = runtimePublicEnv()): string {
  return resolvePublicBase({
    appUrl: env.APP_URL,
    nextPublicAppUrl: env.NEXT_PUBLIC_APP_URL,
    renderExternalUrl: env.RENDER_EXTERNAL_URL,
    authUrl: env.AUTH_URL,
    nextAuthUrl: env.NEXTAUTH_URL,
    forwardedHost: headerList.get("x-forwarded-host"),
    host: headerList.get("host"),
    proto: headerList.get("x-forwarded-proto"),
  });
}

/** Absolute URL for a redirect or a link. The path may include a query string. */
export function publicAbsoluteUrl(path: string, headerList: HeaderSource, env: PublicEnv = runtimePublicEnv()): string {
  const origin = publicOrigin(headerList, env);
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${suffix}`;
}

/** Keeps ?notice= and the rest of the query when a token route redirects to its view page. */
export function withRequestSearch(path: string, requestUrl: string): string {
  const search = new URL(requestUrl).search;
  if (!search || path.includes("?")) return path;
  return `${path}${search}`;
}
