export const TEAM_ROLES = ["SPONSOR", "LENDER", "INVESTOR", "GC", "DESIGN", "ATTORNEY", "BROKER", "ADVISOR", "OTHER"] as const;
export type TeamRoleId = (typeof TEAM_ROLES)[number];

export const TEAM_ROLE_LABELS: Record<TeamRoleId, string> = {
  SPONSOR: "Sponsor",
  LENDER: "Lender",
  INVESTOR: "Investor",
  GC: "General contractor",
  DESIGN: "Design",
  ATTORNEY: "Attorney",
  BROKER: "Broker",
  ADVISOR: "Advisor",
  OTHER: "Other",
};

export const PLATFORM_NDA_NOTICE =
  "Counsel review still required. This is the platform acknowledgement. A sponsor may attach their own form as a document. That file does not replace this acknowledgement.";

export function teamRoleForMember(role: string): TeamRoleId {
  if (role === "GENERAL_CONTRACTOR") return "GC";
  if (role === "BROKER" || role === "MORTGAGE_BROKER") return "BROKER";
  if (role === "RE_ATTORNEY" || role === "SECURITIES_ATTORNEY" || role === "ZONING_ATTORNEY") return "ATTORNEY";
  if (role === "ARCHITECT_ENGINEER") return "DESIGN";
  if (role === "LENDER") return "LENDER";
  if (role === "INVESTOR_PE" || role === "FAMILY_OFFICE") return "INVESTOR";
  if (role === "DEVELOPER") return "SPONSOR";
  if (role === "INSURANCE" || role === "ACCOUNTANT" || role === "APPRAISER" || role === "PROPERTY_MANAGER" || role === "EXCHANGE_1031") return "ADVISOR";
  return "OTHER";
}

export function accessStatusToTeam(status: string): "REQUESTED" | "ADDED" | "DECLINED" | "REMOVED" {
  if (status === "APPROVED") return "ADDED";
  if (status === "REJECTED") return "DECLINED";
  if (status === "REMOVED") return "REMOVED";
  return "REQUESTED";
}

export function canAddToDealTeam(input: { isSponsor: boolean; hasIntro: boolean; hasThread: boolean; blocked: boolean }): { ok: true } | { ok: false; reason: string } {
  if (!input.isSponsor) return { ok: false, reason: "Only the sponsor can add someone to the deal team." };
  if (input.blocked) return { ok: false, reason: "Messaging is closed between these members." };
  if (!input.hasIntro && !input.hasThread) return { ok: false, reason: "Add someone you can already message." };
  return { ok: true };
}

export function documentsOpen(input: { isSponsor: boolean; teamStatus: string | null; ndaAckAt: Date | null }): boolean {
  if (input.isSponsor) return true;
  return input.teamStatus === "ADDED" && Boolean(input.ndaAckAt);
}

export function isMoneyDetail(value: string): boolean {
  return /\$|\birr\b|equity multiple|preferred return/i.test(value);
}

/** Public feed and deal list stay descriptive. Dollar raise details stay in the deal room. */
export function publicRaiseLabel(input: { kind: string; raiseLabel: string; sizeLabel: string }): string {
  if (input.kind === "DEAL" || isMoneyDetail(input.raiseLabel)) return input.sizeLabel || "Size in the deal room";
  return input.raiseLabel;
}

export function folderVisible(input: { isSponsor: boolean; teamRole: TeamRoleId | null; audience: TeamRoleId[]; sponsorOnly: boolean }): boolean {
  if (input.isSponsor) return true;
  if (input.sponsorOnly) return false;
  if (!input.audience.length) return true;
  return Boolean(input.teamRole && input.audience.includes(input.teamRole));
}

export const DEFAULT_DOC_MAX_MB = 25;
export const DEFAULT_DOC_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

export type DocSettings = { maxMb: number; types: string[] };

export function parseDocSettings(rows: { key: string; value: unknown }[]): DocSettings {
  const max = rows.find((row) => row.key === "doc.maxMb")?.value;
  const types = rows.find((row) => row.key === "doc.allowedTypes")?.value;
  const maxMb = typeof max === "object" && max && "n" in max ? Number((max as { n: unknown }).n) : DEFAULT_DOC_MAX_MB;
  const list = typeof types === "object" && types && "types" in types && Array.isArray((types as { types: unknown }).types)
    ? (types as { types: string[] }).types.map((item) => item.toLowerCase())
    : [...DEFAULT_DOC_TYPES];
  return { maxMb: Number.isFinite(maxMb) && maxMb > 0 && maxMb <= 100 ? maxMb : DEFAULT_DOC_MAX_MB, types: list };
}

export function fileAllowed(input: { fileName: string; contentType: string; sizeBytes: number }, settings: DocSettings): { ok: true } | { ok: false; reason: string } {
  if (!input.fileName.trim()) return { ok: false, reason: "Choose a file." };
  if (input.sizeBytes < 1) return { ok: false, reason: "The file is empty." };
  if (input.sizeBytes > settings.maxMb * 1024 * 1024) return { ok: false, reason: `Files must be ${settings.maxMb} MB or smaller.` };
  const type = input.contentType.toLowerCase().split(";")[0]?.trim() || "";
  const normalized = type === "image/jpg" ? "image/jpeg" : type;
  if (!settings.types.includes(normalized)) return { ok: false, reason: "That file type is not allowed." };
  return { ok: true };
}

export function safeStorageKey(dealId: string, documentId: string): string | null {
  if (!/^[a-zA-Z0-9_-]+$/.test(dealId) || !/^[a-zA-Z0-9_-]+$/.test(documentId)) return null;
  return `deals/${dealId}/${documentId}`;
}
