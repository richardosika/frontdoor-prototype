export const MESSAGE_KINDS = ["TEXT", "INTRO", "CONNECTION", "ACCESS", "VOUCH", "DEAL"] as const;
export type MessageKind = (typeof MESSAGE_KINDS)[number];

/** Notices the product posts on a member's behalf. They render as cards, not chat bubbles. */
export const SYSTEM_NOTICE_KINDS = ["CONNECTION", "ACCESS", "VOUCH", "DEAL"] as const;

export function isSystemNotice(kind: string): boolean {
  return (SYSTEM_NOTICE_KINDS as readonly string[]).includes(kind);
}

const SYSTEM_NOTICE_PHRASES = [
  "requested access",
  "approved your request",
  "declined your request",
  "asked a question in the deal room",
  "replied in the deal room",
];

export function isRenderedSystemNotice(kind: string, body: string): boolean {
  if (isSystemNotice(kind)) return true;
  const text = body.toLowerCase();
  return SYSTEM_NOTICE_PHRASES.some((phrase) => text.includes(phrase));
}

export function systemNoticeLabel(kind: string): string {
  if (kind === "ACCESS") return "Access";
  if (kind === "DEAL") return "Deal room";
  if (kind === "CONNECTION") return "Connection";
  if (kind === "VOUCH") return "Vouch";
  return "Notice";
}

export function systemNoticeLabelFor(kind: string, body: string): string {
  if (isSystemNotice(kind)) return systemNoticeLabel(kind);
  const text = body.toLowerCase();
  if (text.includes("deal room")) return "Deal room";
  if (text.includes("access") || text.includes("approved your request") || text.includes("declined your request")) return "Access";
  return "Notice";
}

export const RATE_LIMITS = {
  messagesPerHour: 30,
  introductionsPerDay: 20,
  connectionsPerDay: 20,
  accessPerDay: 10,
  vouchesPerDay: 10,
  reportsPerDay: 5,
} as const;

export const PORTAL_MESSAGE_SUBJECT = "You have a new message on Private Floor";

const PUBLIC_MEMBER_KEYS = ["id", "name", "initials", "org", "location", "role", "tier", "bio", "credentialNote"] as const;

export type MemberRecord = {
  id: string;
  name: string;
  initials: string;
  org: string;
  location: string;
  role: string;
  tier: string;
  bio: string;
  credentialNote: string;
  email: string;
  phone: string;
  linkedinUrl: string;
};

export type PublicMember = Pick<MemberRecord, (typeof PUBLIC_MEMBER_KEYS)[number]>;

export function isMessageKind(value: string): value is MessageKind {
  return (MESSAGE_KINDS as readonly string[]).includes(value);
}

export function withinRateLimit(recentCount: number, limit: number): boolean {
  return recentCount < limit;
}

export function canMessage(input: { fromId: string; toId: string; blockedEitherWay: boolean }): { ok: true } | { ok: false; reason: string } {
  if (!input.fromId || !input.toId) return { ok: false, reason: "Choose a member." };
  if (input.fromId === input.toId) return { ok: false, reason: "You cannot message yourself." };
  if (input.blockedEitherWay) return { ok: false, reason: "Messaging is closed between these members." };
  return { ok: true };
}

export function vouchDelivery(input: { counterpartyIsMember: boolean }): { channel: "portal" | "guest-link"; sendsEmail: false } {
  if (input.counterpartyIsMember) return { channel: "portal", sendsEmail: false };
  return { channel: "guest-link", sendsEmail: false };
}

export function portalMessageEmail(inboxUrl: string): { subject: string; text: string } {
  return {
    subject: PORTAL_MESSAGE_SUBJECT,
    text: `You have a new message on Private Floor\n${inboxUrl}\n`,
  };
}

export function toPublicMember(subject: MemberRecord): PublicMember {
  return {
    id: subject.id,
    name: subject.name,
    initials: subject.initials,
    org: subject.org,
    location: subject.location,
    role: subject.role,
    tier: subject.tier,
    bio: subject.bio,
    credentialNote: subject.credentialNote,
  };
}

export function toAdminMember(subject: MemberRecord) {
  return {
    ...toPublicMember(subject),
    email: subject.email,
    phone: subject.phone,
    linkedinUrl: subject.linkedinUrl,
  };
}

function textResponse(status: 403 | 404): Response {
  return new Response(status === 404 ? "Not found" : "Forbidden", {
    status,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

export function memberDirectoryResponse(input: { viewer: { isAdmin: boolean } | null; subject: MemberRecord | null }): Response {
  if (!input.viewer || !input.subject) return textResponse(404);
  return Response.json(input.viewer.isAdmin ? toAdminMember(input.subject) : toPublicMember(input.subject));
}

export function inboxResponse(input: {
  viewer: { id: string } | null;
  threads: { id: string; preview: string; unread: number; member: MemberRecord }[];
}): Response {
  if (!input.viewer) return textResponse(404);
  return Response.json({
    threads: input.threads.map((thread) => ({
      id: thread.id,
      preview: thread.preview,
      unread: thread.unread,
      member: toPublicMember(thread.member),
    })),
  });
}

export function isModerationPath(path: string): boolean {
  return (
    path === "/admin/messages" ||
    path.startsWith("/admin/messages/") ||
    path === "/api/admin/messages" ||
    path.startsWith("/api/admin/messages/")
  );
}

export function moderationDenial(input: { path: string; actor: { isAdmin: boolean } | null }): 403 | 404 | null {
  if (!isModerationPath(input.path)) return null;
  if (input.actor?.isAdmin) return null;
  if (input.actor && input.path.startsWith("/api/admin/messages")) return 403;
  return 404;
}

export function gateModerationRequest(input: { path: string; actor: { isAdmin: boolean } | null }): Response | null {
  const status = moderationDenial(input);
  if (status == null) return null;
  return textResponse(status);
}

export function moderationQueueResponse(input: {
  viewer: { isAdmin: boolean } | null;
  threads: {
    id: string;
    updatedAt: string;
    preview: string;
    members: MemberRecord[];
  }[];
}): Response {
  const denied = gateModerationRequest({ path: "/api/admin/messages", actor: input.viewer });
  if (denied) return denied;
  return Response.json({
    threads: input.threads.map((thread) => ({
      id: thread.id,
      updatedAt: thread.updatedAt,
      preview: thread.preview,
      members: thread.members.map(toAdminMember),
    })),
  });
}

export function moderationThreadResponse(input: {
  viewer: { isAdmin: boolean } | null;
  thread: {
    id: string;
    messages: { id: string; body: string; kind: string; createdAt: string; sender: MemberRecord }[];
  } | null;
}): Response {
  const denied = gateModerationRequest({ path: "/api/admin/messages/thread", actor: input.viewer });
  if (denied) return denied;
  if (!input.thread) return textResponse(404);
  return Response.json({
    id: input.thread.id,
    messages: input.thread.messages.map((message) => ({
      id: message.id,
      body: message.body,
      kind: message.kind,
      createdAt: message.createdAt,
      sender: toAdminMember(message.sender),
    })),
  });
}
