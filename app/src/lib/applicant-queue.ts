import { matchesApplicationFilter, type ApplicationFilter } from "@/lib/application-status";
import { isDemoRecord, personStanding, type PersonStanding } from "@/lib/person-standing";

export type QueueApplication = {
  id: string;
  email: string;
  status: string;
  isTest?: boolean | null;
  createdAt: number;
  verdict?: string | null;
};

export type QueueInvite = {
  id: string;
  email: string;
  status: string;
  createdAt: number;
};

export type QueueItem = { kind: "application" | "invite"; id: string };

/** A request to join is the applicant's file until they submit the full application. */
export function inviteRequestInApplicantFilter(filter: ApplicationFilter, status: string): boolean {
  if (status === "PENDING") return filter === "action" || filter === "new";
  if (status === "DECLINED") return filter === "declined";
  return false;
}

export function standingForInvite(status: string): PersonStanding {
  return personStanding({ inviteStatus: status });
}

/**
 * Applications and request-to-join rows for one admin filter.
 * A request is omitted when that email already has an application, so the file is not listed twice.
 */
export function applicantQueue(
  filter: ApplicationFilter,
  hideDemo: boolean,
  applications: QueueApplication[],
  invites: QueueInvite[],
): QueueItem[] {
  const applicationEmails = new Set(applications.map((row) => row.email.trim().toLowerCase()));
  const items: { kind: QueueItem["kind"]; id: string; createdAt: number }[] = [];
  for (const application of applications) {
    if (!matchesApplicationFilter(filter, application.status, application.verdict)) continue;
    if (hideDemo && isDemoRecord({ isTest: application.isTest, email: application.email })) continue;
    items.push({ kind: "application", id: application.id, createdAt: application.createdAt });
  }
  for (const invite of invites) {
    if (!inviteRequestInApplicantFilter(filter, invite.status)) continue;
    if (applicationEmails.has(invite.email.trim().toLowerCase())) continue;
    if (hideDemo && isDemoRecord({ email: invite.email })) continue;
    items.push({ kind: "invite", id: invite.id, createdAt: invite.createdAt });
  }
  items.sort((a, b) => b.createdAt - a.createdAt);
  return items.map(({ kind, id }) => ({ kind, id }));
}
