import { BRAND } from "@/lib/brand";

export const EXPIRED_PAYMENT_LINK = `This payment link has expired or is no longer valid. Contact ${BRAND.contactEmail}`;
export const EXPIRED_STATUS_LINK = `This status link has expired or is no longer valid. Contact ${BRAND.contactEmail}`;

export function expiredLinkCopy(kind: "payment" | "status"): { title: string; body: string } {
  if (kind === "payment") return { title: "Payment link", body: EXPIRED_PAYMENT_LINK };
  return { title: "Status link", body: EXPIRED_STATUS_LINK };
}
