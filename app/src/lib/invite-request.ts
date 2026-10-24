import { isRoleId } from "@/lib/roles";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const INVITE_REQUESTS_PER_EMAIL_PER_DAY = 3;

export type InviteRequestInput = {
  name: string;
  email: string;
  role: string;
  company: string;
  city: string;
  note?: string;
  website?: string;
};

export function shouldDiscardInviteRequest(honeypot: string): boolean {
  return honeypot.trim().length > 0;
}

export function validateInviteRequest(input: InviteRequestInput): string[] {
  const errors: string[] = [];
  if (input.name.trim().length < 2) errors.push("Enter your name.");
  if (!EMAIL.test(input.email.trim())) errors.push("Enter a valid email.");
  if (!isRoleId(input.role)) errors.push("Pick a role.");
  if (input.company.trim().length < 2) errors.push("Enter your company.");
  if (input.city.trim().length < 2) errors.push("Enter your city.");
  if ((input.note ?? "").trim().length > 500) errors.push("Keep the note under 500 characters.");
  return errors;
}
