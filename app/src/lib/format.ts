export function timeAgo(date: Date, now = new Date()): string {
  const seconds = Math.max(0, (now.getTime() - date.getTime()) / 1000);
  if (seconds < 45) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 172800) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function tierLabel(tier: string): string {
  if (tier === "CONFIRMED") return "Confirmed";
  if (tier === "VERIFIED") return "Verified";
  return "Invited";
}

export function dealsQuery(input: {
  role?: string | null;
  market?: string | null;
  size?: string | null;
  q?: string | null;
}): string {
  const params = new URLSearchParams();
  if (input.role && input.role !== "Any") params.set("role", input.role);
  if (input.market && input.market !== "Any") params.set("market", input.market);
  if (input.size && input.size !== "Any") params.set("size", input.size);
  if (input.q) params.set("q", input.q);
  const value = params.toString();
  return value ? `/deals?${value}` : "/deals";
}
