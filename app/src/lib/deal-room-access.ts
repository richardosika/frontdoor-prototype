/**
 * Nov 10 (Julia's minutes), Deal Rooms:
 * - Deal Rooms are a section of each project and store construction documents, specs, renderings and more.
 * - Developers, general contractors, architects and engineers can create one for a project they own. Every other
 *   vendor category can get access but cannot create one.
 * - Developers and GCs choose how members get in:
 *   Open to Bid: anyone who meets the project's requirements gets in without approval (contact and Deal Room).
 *   Approval Required: the owner approves every member before they can bid or enter the Deal Room.
 */
export const DEAL_ROOM_CREATOR_ROLES = [
  "DEVELOPER",
  "GENERAL_CONTRACTOR",
  "ARCHITECT_ENGINEER",
  "CIVIL_ENGINEER",
  "STRUCTURAL_ENGINEER",
  "MEP_ENGINEER",
  "GEOTECH_ENGINEER",
] as const;

/** Members who choose Open to Bid or Approval Required. */
export const ACCESS_MODE_ROLES = ["DEVELOPER", "GENERAL_CONTRACTOR"] as const;

export type AccessMode = "OPEN" | "APPROVAL";
export const ACCESS_MODES: { id: AccessMode; label: string; help: string }[] = [
  { id: "OPEN", label: "Open to Bid", help: "Anyone who meets the requirements of your projects gets in without your approval, and your Deal Rooms are open to them." },
  { id: "APPROVAL", label: "Approval Required", help: "You approve every member before they can bid on your projects or enter your Deal Rooms." },
];

export const DOC_KINDS = [
  { id: "CONSTRUCTION", label: "Construction documents" },
  { id: "SPECS", label: "Specs" },
  { id: "RENDERING", label: "Renderings" },
  { id: "OTHER", label: "Other" },
] as const;

export const DEAL_ROOM_DOC_MAX_BYTES = 25 * 1024 * 1024;

export function canCreateDealRoom(role: string | null | undefined): boolean {
  return (DEAL_ROOM_CREATOR_ROLES as readonly string[]).includes(String(role ?? ""));
}

export function choosesAccessMode(role: string | null | undefined): boolean {
  return (ACCESS_MODE_ROLES as readonly string[]).includes(String(role ?? ""));
}

/** The owner's mode. Only developers and GCs can be Open to Bid; everyone else is Approval Required. */
export function accessModeOf(owner: { role: string; projectAccessMode?: string | null }): AccessMode {
  return choosesAccessMode(owner.role) && owner.projectAccessMode === "OPEN" ? "OPEN" : "APPROVAL";
}

export function isAccessMode(value: unknown): value is AccessMode {
  return value === "OPEN" || value === "APPROVAL";
}

export function docKindLabel(id: string): string {
  return DOC_KINDS.find((k) => k.id === id)?.label ?? "";
}
