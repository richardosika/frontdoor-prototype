import { monthlyDuesCents, duesLabel, offerLabel } from "@/lib/dues";

export type AttentionCounts = {
  awaitingDecision: number;
  infoReplies: number;
  paymentsDueOrFailed: number;
  reports: number;
  flaggedPosts: number;
  introAndDealIssues: number;
  followUpsDue: number;
};

export type AttentionItem = {
  id: string;
  label: string;
  count: number;
  href: string;
  hot: boolean;
};

export type ActivityKind = "decision" | "moderation" | "verification";

export type ActivityRow = {
  id: string;
  at: string;
  kind: ActivityKind;
  text: string;
  href: string;
};

export type AdminLink = { href: string; label: string };

export type AdminGroup = { label: string; links: readonly AdminLink[] };

/** Left navigation, in the order an administrator walks the floor. */
export const ADMIN_GROUPS: readonly AdminGroup[] = [
  {
    label: "Applications & Verification",
    links: [
      { href: "/admin/applications", label: "Applications" },
      { href: "/admin/verification", label: "Verification files" },
    ],
  },
  {
    label: "Members",
    links: [
      { href: "/admin/members", label: "Members" },
      { href: "/admin/access", label: "Introductions and deal rooms" },
    ],
  },
  {
    label: "Directory setup",
    links: [
      { href: "/admin/taxonomy", label: "Asset types and fields" },
      { href: "/admin/markets", label: "Markets" },
      { href: "/admin/specialties", label: "Specialties" },
      { href: "/admin/readiness", label: "Readiness" },
    ],
  },
  {
    label: "Payments",
    links: [{ href: "/admin/payments", label: "Payments" }],
  },
  {
    label: "CRM",
    links: [{ href: "/admin/crm", label: "People" }],
  },
  {
    label: "Email templates & Outbox",
    links: [
      { href: "/admin/templates", label: "Email templates" },
      { href: "/admin/outbox", label: "Outbox" },
    ],
  },
  {
    label: "Moderation",
    links: [
      { href: "/admin/moderation", label: "Moderation queue" },
      { href: "/admin/licences", label: "Licences" },
      { href: "/admin/showcase", label: "Vendor showcase" },
      { href: "/admin/messages", label: "Messages" },
    ],
  },
  {
    label: "Content/Legal versions",
    links: [{ href: "/admin/legal", label: "Legal versions" }],
  },
  {
    label: "Help",
    links: [
      { href: "/admin/help", label: "Questions" },
      { href: "/admin/help/faq", label: "FAQ and knowledge" },
    ],
  },
  {
    label: "Settings",
    links: [
      { href: "/admin/settings", label: "Delivery and dues" },
      { href: "/admin/sources", label: "Sources and watchlists" },
    ],
  },
  {
    label: "Audit log",
    links: [{ href: "/admin/audit", label: "Audit log" }],
  },
  {
    label: "Test console",
    links: [{ href: "/admin/test", label: "Test console" }],
  },
];

export const COMMAND_CENTER = { href: "/admin", label: "Command center" } as const;

const DUES_ROWS: { role: string; label: string }[] = [
  { role: "DEVELOPER", label: "Developer" },
  { role: "INVESTOR_PE", label: "Investor / LP" },
  { role: "FAMILY_OFFICE", label: "Family office" },
  { role: "LENDER", label: "Lender" },
  { role: "GENERAL_CONTRACTOR", label: "General contractor" },
  { role: "BROKER", label: "Broker" },
  { role: "MORTGAGE_BROKER", label: "Mortgage broker" },
  { role: "RE_ATTORNEY", label: "Attorney / advisor" },
];

export function duesSchedule(): { role: string; label: string; cents: number; text: string }[] {
  return DUES_ROWS.map((row) => {
    const cents = monthlyDuesCents(row.role);
    return { role: row.role, label: row.label, cents, text: cents > 0 ? offerLabel(cents) : duesLabel(cents) };
  });
}

/** Home is exact. Every other admin link stays active on its nested routes. */
export function adminLinkActive(pathname: string, href: string): boolean {
  const path = href.split("?")[0] || href;
  if (path === "/admin") return pathname === "/admin";
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function attentionItems(counts: AttentionCounts): AttentionItem[] {
  const rows: Omit<AttentionItem, "hot">[] = [
    {
      id: "decision",
      label: "Applications awaiting a decision",
      count: counts.awaitingDecision,
      href: "/admin/applications?filter=action",
    },
    {
      id: "replies",
      label: "Needs-more-info replies",
      count: counts.infoReplies,
      href: "/admin/applications?filter=review",
    },
    {
      id: "payments",
      label: "Payments due or failed",
      count: counts.paymentsDueOrFailed,
      href: "/admin/payments",
    },
    {
      id: "reports",
      label: "Reports",
      count: counts.reports,
      href: "/admin/moderation",
    },
    {
      id: "posts",
      label: "Flagged posts",
      count: counts.flaggedPosts,
      href: "/admin/moderation",
    },
    {
      id: "access",
      label: "Introductions and deal rooms",
      count: counts.introAndDealIssues,
      href: "/admin/access",
    },
    {
      id: "followups",
      label: "CRM follow-ups due",
      count: counts.followUpsDue,
      href: "/admin/crm?due=1",
    },
  ];
  return rows.map((row) => ({ ...row, hot: row.count > 0 }));
}

export function funnelCounts(
  rows: { status: string; count: number }[],
  activeMembers: number,
): { label: string; value: number }[] {
  const count = (status: string) => rows.find((row) => row.status === status)?.count ?? 0;
  return [
    { label: "Submitted", value: count("SUBMITTED") + count("PENDING") },
    { label: "In review", value: count("IN_REVIEW") + count("NEEDS_INFO") },
    { label: "Approved", value: count("APPROVED") },
    { label: "Payment due", value: count("PAYMENT_DUE") },
    { label: "Declined", value: count("DECLINED") + count("REJECTED") },
    { label: "Active members", value: activeMembers },
  ];
}

export const ACTIVITY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function activitySince(now = new Date()): Date {
  return new Date(now.getTime() - ACTIVITY_WINDOW_MS);
}

/** Activity lines use words. Stored enums such as NEEDS_OWNER_DECISION stay in the database. */
export function plainActivityText(text: string): string {
  return text
    .replaceAll("verdict NEEDS_OWNER_DECISION", "Needs your decision")
    .replaceAll("NEEDS_OWNER_DECISION", "Needs your decision")
    .replaceAll("NOT_LEGIT", "Recommended not legit")
    .replaceAll("verdict LEGIT", "Recommended legit")
    .replaceAll(/\bLEGIT\b/g, "Recommended legit");
}

export function mergeActivity(rows: ActivityRow[], limit = 12): ActivityRow[] {
  return [...rows].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)).slice(0, limit);
}

/** Admin form return path. Rejects anything that could leave /admin. */
export function safeAdminBack(value: string, fallback = "/admin/templates"): string {
  if (value === "/admin") return value;
  if (
    value.startsWith("/admin/") &&
    !value.includes("://") &&
    !value.includes("\\") &&
    !value.includes("..") &&
    !value.includes("?") &&
    !value.includes("#")
  ) {
    return value;
  }
  return fallback;
}
