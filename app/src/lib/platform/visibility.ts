export const VISIBILITY_FIELDS = ["lookingFor", "offering", "checkSize"] as const;
export type VisibilityField = (typeof VISIBILITY_FIELDS)[number];

export const FIELD_AUDIENCES = ["MEMBERS", "CONNECTIONS", "PRIVATE"] as const;
export type FieldAudienceChoice = (typeof FIELD_AUDIENCES)[number];

export function parseAudience(value: string): FieldAudienceChoice {
  const raw = value.trim().toUpperCase();
  if (raw === "CONNECTIONS" || raw === "PRIVATE") return raw;
  return "MEMBERS";
}

export function fieldVisible(input: {
  audience: FieldAudienceChoice | null | undefined;
  isSelf: boolean;
  connected: boolean;
}): boolean {
  if (input.isSelf) return true;
  const audience = input.audience ?? "MEMBERS";
  if (audience === "PRIVATE") return false;
  if (audience === "CONNECTIONS") return input.connected;
  return true;
}

export const MEMBER_HIDDEN_KEYS = [
  "email",
  "phone",
  "passwordHash",
  "credentialNote",
  "grade",
  "gradeSnapshot",
  "score",
  "letter",
  "evidence",
  "sources",
  "internalNote",
  "reviewerNote",
] as const;
