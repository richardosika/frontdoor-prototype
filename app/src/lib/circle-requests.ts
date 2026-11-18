/**
 * Nov 16 (Julia's test, steps 21 and 24): circle ("Add to My Circle") request helpers that need no database.
 * - Members blocked either way never appear in Recommended for you or in the incoming request list.
 * - Circle request system messages point to My Circle (Find your team for developers), not the old "Network" page,
 *   and render in the reader's language.
 */

/** A safe internal path for redirects: starts with one slash, no protocol-relative or control characters. */
export function safeBack(raw: unknown): string | null {
  const value = String(raw ?? "");
  if (!value.startsWith("/") || value.startsWith("//") || /[\\\r\n]/.test(value)) return null;
  const url = new URL(value, "https://internal.local");
  if (url.origin !== "https://internal.local" || url.pathname.startsWith("//")) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}

/** Adds ?key=text to an internal path, keeping any #hash at the end. */
export function withParam(path: string, key: string, text: string): string {
  const url = new URL(path, "https://internal.local");
  url.searchParams.set(key, text);
  return `${url.pathname}${url.search}${url.hash}`;
}

/** Ids of members the viewer blocked or who blocked the viewer. */
export function blockedIds(viewerId: string, blocks: { blockerId: string; blockedId: string }[]): Set<string> {
  return new Set(blocks.filter((b) => b.blockerId === viewerId || b.blockedId === viewerId).map((b) => (b.blockerId === viewerId ? b.blockedId : b.blockerId)));
}

/** Drops members blocked either way. */
export function withoutBlocked<T extends { id: string }>(rows: T[], blocked: Set<string>): T[] {
  return rows.filter((row) => !blocked.has(row.id));
}

/** Where a member answers circle requests: developers on Find your team, everyone else on My Circle. */
export function circleHome(role: string | null | undefined): { href: string; label: "My Circle" | "Find your team" } {
  return role === "DEVELOPER" ? { href: "/deals#my-circle", label: "Find your team" } : { href: "/network#circle-requests", label: "My Circle" };
}

export const CIRCLE_TEMPLATES = {
  request: "{name} asked to join your circle. Accept or decline in {place}.",
  intro: "{name} asked for an introduction. Accept or decline in {place}.",
  accepted: "{name} accepted your connection request.",
  declined: "{name} declined your connection request.",
} as const;
export type CircleTemplate = keyof typeof CIRCLE_TEMPLATES;

/** The English body stored with a new circle request or introduction message. */
export function circleMessageBody(kind: "request" | "intro", name: string, recipientRole: string | null | undefined): string {
  return CIRCLE_TEMPLATES[kind].replace("{name}", name).replace("{place}", circleHome(recipientRole).label);
}

const PATTERNS: { re: RegExp; template: CircleTemplate }[] = [
  { re: /^(.+) requested to connect\. Accept or decline in (?:Network|My Circle|Find your team)\.$/, template: "request" },
  { re: /^(.+) asked to join your circle\. Accept or decline in (?:Network|My Circle|Find your team)\.$/, template: "request" },
  { re: /^(.+) asked for an introduction\. Accept or decline in (?:Network|My Circle|Find your team)\.$/, template: "intro" },
  { re: /^(.+) accepted your connection request\.$/, template: "accepted" },
  { re: /^(.+) declined your connection request\.$/, template: "declined" },
];

/**
 * Rebuilds a stored circle message in the reader's language. Old messages that say "Network" now point to My Circle
 * (or Find your team for a developer reader). Any other body is returned unchanged.
 */
export function renderCircleMessage(body: string, readerRole: string | null | undefined, tx: (text: string) => string): string {
  const text = body.trim();
  for (const { re, template } of PATTERNS) {
    const match = text.match(re);
    if (!match) continue;
    return tx(CIRCLE_TEMPLATES[template]).replace("{name}", match[1]).replace("{place}", tx(circleHome(readerRole).label));
  }
  return body;
}
