/**
 * Who sees which projects and people (#25, #27, #28).
 *
 * A member sees an approved project only when it seeks the member's category or when the member is in the owner's
 * circle. Owners and Private Floor administrators always see it. Nobody browses the full member list: developers see
 * members in the categories their own approved projects seek ("Find your team"); everyone else sees only people
 * connected to them through a project ("My Circle").
 */
import { categoryForRole, parseSeeking } from "@/lib/project-contact";

export type AccessProject = { userId: string; reviewStatus: string; seeking: string };
export type AccessViewer = { id: string; isAdmin: boolean; role: string; inOwnerCircle: boolean };

export function projectAccessible(project: AccessProject, viewer: AccessViewer): boolean {
  if (project.userId === viewer.id || viewer.isAdmin) return true;
  if (project.reviewStatus !== "APPROVED") return false;
  if (viewer.inOwnerCircle) return true;
  const category = categoryForRole(viewer.role);
  return Boolean(category && parseSeeking(project.seeking).includes(category));
}

/** Developers build teams; every other member type answers projects. */
export function isDeveloperRole(role: string | null | undefined): boolean {
  return role === "DEVELOPER";
}

/** Navigation for the member: developers get "Find your team" and no separate Network; others get Opportunities and My Circle. */
export function memberNav(role: string | null | undefined): { href: string; label: string; test: string }[] {
  if (isDeveloperRole(role)) {
    return [
      { href: "/feed", label: "Ledger", test: "tab-feed" },
      { href: "/deals", label: "Find your team", test: "tab-deals" },
      { href: "/messages", label: "Messages", test: "tab-messages" },
      { href: "/profile", label: "Profile", test: "tab-profile" },
    ];
  }
  return [
    { href: "/feed", label: "Ledger", test: "tab-feed" },
    { href: "/deals", label: "Opportunities", test: "tab-deals" },
    { href: "/network", label: "My Circle", test: "tab-network" },
    { href: "/messages", label: "Messages", test: "tab-messages" },
    { href: "/profile", label: "Profile", test: "tab-profile" },
  ];
}

/** Deal size bands for the slim filter bar, in US dollars. */
export const DEAL_SIZE_BANDS = [
  { id: "lt5", label: "Under $5M", min: 0, max: 5_000_000 },
  { id: "5to25", label: "$5M to $25M", min: 5_000_000, max: 25_000_000 },
  { id: "25to100", label: "$25M to $100M", min: 25_000_000, max: 100_000_000 },
  { id: "gt100", label: "$100M and up", min: 100_000_000, max: Number.POSITIVE_INFINITY },
] as const;

/** Read a project value such as "$24M", "$2.5 million", "24,000,000" or "$850K" as dollars, or null. */
export function parseDollars(label: string): number | null {
  const clean = label.toLowerCase().replace(/[$,\s]/g, "");
  const match = clean.match(/^(\d+(?:\.\d+)?)(k|m|mm|million|b|bn|billion)?/);
  if (!match) return null;
  const n = Number(match[1]);
  if (!Number.isFinite(n)) return null;
  const unit = match[2] ?? "";
  if (unit === "k") return n * 1_000;
  if (unit === "m" || unit === "mm" || unit === "million") return n * 1_000_000;
  if (unit === "b" || unit === "bn" || unit === "billion") return n * 1_000_000_000;
  return n;
}

export type SlimFilters = { asset: string; state: string; size: string };

export function readSlimFilters(params: Record<string, string | string[] | undefined>): SlimFilters {
  const one = (key: string) => {
    const value = params[key];
    return (Array.isArray(value) ? value[0] : value ?? "").slice(0, 60);
  };
  const size = one("size");
  return { asset: one("asset"), state: one("state").toUpperCase().slice(0, 2), size: DEAL_SIZE_BANDS.some((b) => b.id === size) ? size : "" };
}

export function matchesSlimFilters(project: { asset: string; state: string; location: string; valueLabel: string }, filters: SlimFilters): boolean {
  if (filters.asset && project.asset !== filters.asset) return false;
  if (filters.state) {
    const state = (project.state || project.location.split(",").pop() || "").trim().toUpperCase();
    if (state !== filters.state) return false;
  }
  if (filters.size) {
    const band = DEAL_SIZE_BANDS.find((b) => b.id === filters.size);
    const value = parseDollars(project.valueLabel);
    if (!band || value === null || value < band.min || value >= band.max) return false;
  }
  return true;
}

export type StartItem = { id: string; label: string; href: string; done: boolean };

/** The role-tailored "Getting started" checklist. Every item completes itself from what the member has done. */
export function gettingStarted(input: {
  role: string;
  profileDone: boolean;
  ndaAccepted: boolean;
  projectCount: number;
  seekingSet: boolean;
  approvedProject: boolean;
  outreachSent: number;
  hasPhoto: boolean;
}): StartItem[] {
  if (isDeveloperRole(input.role)) {
    return [
      { id: "nda", label: "Accept the Member NDA", href: "/member-nda", done: input.ndaAccepted },
      { id: "profile", label: "Complete your profile", href: "/profile", done: input.profileDone },
      { id: "project", label: "Add your first project", href: "/feed#ledger-add-project", done: input.projectCount > 0 },
      { id: "seeking", label: "Choose who you're seeking", href: "/feed#ledger-my-projects", done: input.seekingSet },
      { id: "approved", label: "Get a project approved by staff", href: "/feed#ledger-my-projects", done: input.approvedProject },
      { id: "reach", label: "Reach out to a member on your team", href: "/deals", done: input.outreachSent > 0 },
    ];
  }
  return [
    { id: "nda", label: "Accept the Member NDA", href: "/member-nda", done: input.ndaAccepted },
    { id: "profile", label: "Complete your profile", href: "/profile", done: input.profileDone },
    { id: "photo", label: "Add a profile photo", href: "/profile", done: input.hasPhoto },
    { id: "work", label: "Add a past project to show your work", href: "/feed#ledger-add-project", done: input.projectCount > 0 },
    { id: "reach", label: "Contact a project seeking your category", href: "/deals", done: input.outreachSent > 0 },
  ];
}
