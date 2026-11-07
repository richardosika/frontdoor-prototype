/**
 * #43 "Refer a colleague". Each member can refer a set number of colleagues. The code rides inside the apply link
 * in the email; the member never sees or copies it. Status per referral: Sent, Applied, Approved.
 */
export const REFERRAL_ALLOWANCE = 3;

export type ReferralStatus = "Sent" | "Applied" | "Approved";

export function referralsLeft(sentCount: number, allowance = REFERRAL_ALLOWANCE): number {
  return Math.max(0, allowance - sentCount);
}

/** Approved once an application on the code is approved (or paid); Applied once anyone applied with it; else Sent. */
export function referralStatus(applications: { status: string }[]): ReferralStatus {
  if (applications.some((a) => a.status === "APPROVED" || a.status === "PAYMENT_DUE")) return "Approved";
  if (applications.length > 0) return "Applied";
  return "Sent";
}
