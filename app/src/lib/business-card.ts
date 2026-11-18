export const BUSINESS_CARD_MAX_BYTES = 5 * 1024 * 1024;

export const CARD_UPLOADED_NOTE = "Business card uploaded";
export const CARD_MISSING_NOTE = "No business card uploaded";

const BUSINESS_CARD_TYPES = ["image/jpeg", "image/png", "application/pdf"] as const;
export type BusinessCardType = (typeof BUSINESS_CARD_TYPES)[number];

export function sniffBusinessCard(bytes: Uint8Array): BusinessCardType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return "application/pdf";
  return null;
}

export function normalizeBusinessCardType(value: string): string {
  const base = value.toLowerCase().split(";")[0]?.trim() ?? "";
  if (base === "image/jpg" || base === "image/pjpeg") return "image/jpeg";
  return base;
}

export function validateBusinessCard(input: {
  contentType: string;
  bytes: Uint8Array;
}): { ok: true; contentType: BusinessCardType } | { ok: false; error: string } {
  if (input.bytes.byteLength === 0) return { ok: false, error: "The business card file is empty." };
  if (input.bytes.byteLength > BUSINESS_CARD_MAX_BYTES) {
    return { ok: false, error: "Business card must be 5 MB or smaller." };
  }
  const sniffed = sniffBusinessCard(input.bytes);
  const declared = normalizeBusinessCardType(input.contentType);
  if (!sniffed || declared !== sniffed) {
    return { ok: false, error: "Upload a JPG, PNG, or PDF business card." };
  }
  return { ok: true, contentType: sniffed };
}

export function safeCardFileName(name: string): string {
  const base = name.split(/[/\\]/).pop()?.replace(/[^\w.\- ]+/g, "") ?? "";
  const trimmed = base.trim().slice(0, 120);
  return trimmed || "business-card";
}
