export function timeAgo(date: Date, now = new Date()): string {
  const seconds = Math.max(0, (now.getTime() - date.getTime()) / 1000);
  if (seconds < 45) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 172800) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export const AUDIT_TIME_ZONE = "America/New_York";

export function tierLabel(tier: string): string {
  if (tier === "INVITED" || tier === "VERIFIED" || tier === "CONFIRMED") return "Approved";
  return "Approved";
}

export function membershipChipLabel(_tier: string): string {
  return "Approved";
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/** Calendar date in America/New_York as YYYY-MM-DD. */
export function formatEtDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: AUDIT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatAuditTime(date: Date): string {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: AUDIT_TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
  return `${formatted} (${AUDIT_TIME_ZONE})`;
}

export function dealsQuery(input: {
  role?: string | null;
  market?: string | null;
  size?: string | null;
  q?: string | null;
  asset?: string | null;
  stage?: string | null;
  need?: string | null;
  posted?: string | null;
  sort?: string | null;
}): string {
  const params = new URLSearchParams();
  const set = (key: string, value: string | null | undefined) => {
    if (value && value !== "Any" && value !== "All") params.set(key, value);
  };
  set("role", input.role);
  set("market", input.market);
  set("size", input.size);
  set("asset", input.asset);
  set("stage", input.stage);
  set("need", input.need);
  set("posted", input.posted);
  set("sort", input.sort);
  set("q", input.q);
  const value = params.toString();
  return value ? `/deals?${value}` : "/deals";
}
