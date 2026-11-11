/**
 * Nov 10 (Julia): Member Directory. Members search for people who belong to the club by name, company, category or
 * location. Staff accounts never appear. Subcontractors do not see developers or the vendor categories hidden from them.
 */
import { isStaffAccount } from "@/lib/recommendations";
import { roleById } from "@/lib/roles";
import { subCanSee } from "@/lib/sub-access";
import { eligibleForDirectory } from "@/lib/payments";

export type DirectoryRow = {
  id: string;
  name: string;
  initials: string;
  org: string;
  role: string;
  location: string;
  photoId?: string | null;
  extraCategories?: string | null;
  email?: string | null;
  isAdmin?: boolean | null;
  status: string;
  paymentStatus: string;
};

export type DirectoryQuery = { q?: string; category?: string; location?: string };

export const DIRECTORY_PAGE_SIZE = 60;

function norm(text: string): string {
  return text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

/** Who a member may see in the directory, and which match the search. Sorted by name. */
export function filterDirectory(
  rows: DirectoryRow[],
  viewer: { id: string; role: string; extraCategories?: string | null },
  query: DirectoryQuery,
  options: { staffNames?: Set<string>; blocked?: Set<string>; shown?: (text: string) => string } = {},
): DirectoryRow[] {
  const q = norm(query.q ?? "");
  const loc = norm(query.location ?? "");
  const category = (query.category ?? "").trim();
  return rows
    .filter((row) => row.id !== viewer.id)
    .filter((row) => eligibleForDirectory(row))
    .filter((row) => !isStaffAccount(row, options.staffNames))
    .filter((row) => !options.blocked?.has(row.id))
    .filter((row) => subCanSee(viewer, row))
    .filter((row) => !category || row.role === category)
    .filter((row) => !loc || norm(row.location).includes(loc))
    .filter((row) => {
      if (!q) return true;
      const cat = roleById(row.role)?.category ?? "";
      const hay = norm([row.name, row.org, cat, options.shown ? options.shown(cat) : "", roleById(row.role)?.label ?? "", row.location].join(" "));
      return q.split(/\s+/).every((word) => hay.includes(word));
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
