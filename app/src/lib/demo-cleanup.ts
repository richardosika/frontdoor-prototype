export type NamedAccount = {
  id: string;
  email: string;
  isTest: boolean;
  isAdmin: boolean;
  createdAt: Date;
};

/** Keep the oldest example or test account with this name. Never select a real address or an administrator. */
export function duplicateExampleIds(rows: NamedAccount[]): string[] {
  const eligible = rows
    .filter((row) => !row.isAdmin && (row.isTest || row.email.toLowerCase().endsWith(".example")))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));
  if (eligible.length < 2) return [];
  return eligible.slice(1).map((row) => row.id);
}

export function cleanupWindowHours(raw: string): number | null {
  const hours = Number(raw);
  if (!Number.isInteger(hours) || hours < 1 || hours > 168) return null;
  return hours;
}

export function applicantRemovalList(input: { member: boolean; crm: boolean }): string[] {
  const items = ["the application", "the verification case", "verification runs", "outbox notices for that email", "the business card"];
  if (input.member) items.push("the linked member account", "that member's posts and messages");
  if (input.crm) items.push("the CRM person record");
  return items;
}
