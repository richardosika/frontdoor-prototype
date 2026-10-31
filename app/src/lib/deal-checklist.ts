/** #41 deal room due-diligence checklist: the starter list, statuses and pure helpers. */

export const CHECKLIST_STATUSES = ["NEEDED", "IN_PROGRESS", "DONE"] as const;
export type ChecklistStatus = (typeof CHECKLIST_STATUSES)[number];
export const STATUS_LABEL: Record<ChecklistStatus, string> = { NEEDED: "Needed", IN_PROGRESS: "In progress", DONE: "Done" };

export const CHECKLIST_SECTIONS = ["Site & Title", "Approvals & Permits", "Budget & Financing", "Insurance", "Contracts"] as const;

/** The starter checklist a developer gets in a new deal room. Each item maps to the member category that usually fills it. */
export const STARTER_CHECKLIST: { section: (typeof CHECKLIST_SECTIONS)[number]; title: string; category: string }[] = [
  { section: "Site & Title", title: "Boundary and topographic survey", category: "SURVEYOR" },
  { section: "Site & Title", title: "Title report and commitment", category: "TITLE_COMPANY" },
  { section: "Site & Title", title: "Phase I environmental site assessment", category: "ENVIRONMENTAL_CONSULTANT" },
  { section: "Site & Title", title: "Geotechnical report", category: "GEOTECH_ENGINEER" },
  { section: "Approvals & Permits", title: "Zoning approval", category: "ZONING_ATTORNEY" },
  { section: "Approvals & Permits", title: "Site plan and civil drawings", category: "CIVIL_ENGINEER" },
  { section: "Approvals & Permits", title: "Structural drawings", category: "STRUCTURAL_ENGINEER" },
  { section: "Approvals & Permits", title: "MEP drawings", category: "MEP_ENGINEER" },
  { section: "Approvals & Permits", title: "Building permit", category: "PERMIT_EXPEDITER" },
  { section: "Approvals & Permits", title: "Utility will-serve letters", category: "CIVIL_ENGINEER" },
  { section: "Budget & Financing", title: "GC budget", category: "GENERAL_CONTRACTOR" },
  { section: "Budget & Financing", title: "Lender term sheet", category: "FINANCING" },
  { section: "Budget & Financing", title: "Appraisal", category: "APPRAISER" },
  { section: "Insurance", title: "Builder's risk policy", category: "INSURANCE" },
  { section: "Insurance", title: "GC certificate of insurance", category: "GENERAL_CONTRACTOR" },
  { section: "Insurance", title: "General liability policy", category: "INSURANCE" },
  { section: "Insurance", title: "Performance and payment bonds", category: "SURETY_BONDING" },
  { section: "Contracts", title: "GC agreement", category: "RE_ATTORNEY" },
  { section: "Contracts", title: "Architect agreement", category: "ARCHITECT_ENGINEER" },
  { section: "Contracts", title: "Operating agreement", category: "RE_ATTORNEY" },
];

export function isChecklistStatus(value: string): value is ChecklistStatus {
  return (CHECKLIST_STATUSES as readonly string[]).includes(value);
}

function startOfDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/** Past its due date and not done. A due date of today is not overdue. */
export function isOverdue(item: { status: string; dueDate: Date | null }, now = new Date()): boolean {
  return Boolean(item.dueDate && item.status !== "DONE" && startOfDay(item.dueDate) < startOfDay(now));
}

export function daysOverdue(item: { dueDate: Date | null }, now = new Date()): number {
  if (!item.dueDate) return 0;
  return Math.max(0, Math.round((startOfDay(now) - startOfDay(item.dueDate)) / 86_400_000));
}

export type ChecklistFilter = "all" | "mine" | "overdue";
export function readChecklistFilter(value: string | undefined): ChecklistFilter {
  return value === "mine" || value === "overdue" ? value : "all";
}

export function filterChecklist<T extends { status: string; dueDate: Date | null; assigneeId: string | null }>(items: T[], filter: ChecklistFilter, userId: string, now = new Date()): T[] {
  if (filter === "mine") return items.filter((item) => item.assigneeId === userId);
  if (filter === "overdue") return items.filter((item) => isOverdue(item, now));
  return items;
}

export function checklistProgress(items: { status: string }[]): { done: number; total: number; percent: number } {
  const done = items.filter((item) => item.status === "DONE").length;
  return { done, total: items.length, percent: items.length ? Math.round((done / items.length) * 100) : 0 };
}

/** Parse a yyyy-mm-dd date from a form, as noon UTC so it shows the same day everywhere. */
export function parseDueDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function dueInputValue(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

export const CHECKLIST_FILE_MAX = 10 * 1024 * 1024;
export const CHECKLIST_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword", "text/csv"];
