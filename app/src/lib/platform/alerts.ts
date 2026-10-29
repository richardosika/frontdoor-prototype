import { cleanProjectQuery, parseProjectQuery } from "@/lib/project-filter";
import type { DirectoryPerson } from "@/lib/platform/directory";
import { searchDirectory } from "@/lib/platform/directory";

export type SavedSearchRow = {
  id: string;
  userId: string;
  name: string;
  query: string;
  alreadySent: boolean;
};

export type PlannedAlert = {
  filterId: string;
  userId: string;
  subject: string;
  text: string;
  href: string;
};

export function memberMatchesSavedQuery(member: DirectoryPerson, query: string, others: DirectoryPerson[] = []): boolean {
  const filters = cleanProjectQuery(parseProjectQuery(Object.fromEntries(new URLSearchParams(query))), "network");
  const directoryFilter = {
    role: filters.role,
    state: filters.state,
    metro: filters.metro,
    asset: filters.assetClass,
    specialty: filters.specialty,
    size: filters.size,
    dealType: filters.dealType,
    q: filters.q,
    place: filters.place,
    group: filters.group,
  };
  const withMember = [member, ...others.filter((person) => person.id !== member.id)];
  const found = searchDirectory(withMember, directoryFilter);
  const row = found.rows.find((person) => person.id === member.id);
  if (!row) return false;
  if (!filters.metro && !filters.state) return true;
  return row.reason !== "Shown while this market is growing" && row.rank >= 100;
}

export function savedSearchNotice(input: { filterName: string; memberName: string; org: string; roleLabel: string; homeBase: string; href: string }): { subject: string; text: string } {
  const subject = `A member matches ${input.filterName}`;
  const text = [
    `${input.memberName} at ${input.org} matches your saved search ${input.filterName}.`,
    `${input.roleLabel}. ${input.homeBase}.`,
    "Open the directory in Private Floor. Contact details stay off the directory.",
    input.href,
  ].join("\n");
  return { subject, text };
}

export function planSavedSearchAlerts(input: { member: DirectoryPerson; homeBase: string; roleLabel: string; filters: SavedSearchRow[]; hrefFor: (memberId: string) => string }): PlannedAlert[] {
  const planned: PlannedAlert[] = [];
  for (const filter of input.filters) {
    if (filter.alreadySent || filter.userId === input.member.id) continue;
    if (!memberMatchesSavedQuery(input.member, filter.query)) continue;
    const notice = savedSearchNotice({
      filterName: filter.name,
      memberName: input.member.name,
      org: input.member.org,
      roleLabel: input.roleLabel,
      homeBase: input.homeBase,
      href: input.hrefFor(input.member.id),
    });
    planned.push({ filterId: filter.id, userId: filter.userId, ...notice, href: input.hrefFor(input.member.id) });
  }
  return planned;
}
