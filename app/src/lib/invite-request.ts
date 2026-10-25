import { formatAddress, validateAddress, validatePersonName, type AddressParts } from "@/lib/person-fields";
import { isRoleId } from "@/lib/roles";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const INVITE_REQUESTS_PER_EMAIL_PER_DAY = 3;

export type InviteRequestInput = {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  company: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  note?: string;
  website?: string;
};

export function shouldDiscardInviteRequest(honeypot: string): boolean {
  return honeypot.trim().length > 0;
}

export function validateInviteRequest(input: InviteRequestInput): string[] {
  const errors: string[] = [];
  errors.push(...validatePersonName(input.firstName, input.lastName));
  if (!EMAIL.test(input.email.trim())) errors.push("Enter a valid email.");
  if (!isRoleId(input.role)) errors.push("Pick a role.");
  if (input.company.trim().length < 2) errors.push("Enter your company.");
  errors.push(
    ...validateAddress({
      street: input.street,
      city: input.city,
      state: input.state,
      zip: input.zip,
    }),
  );
  if ((input.note ?? "").trim().length > 500) errors.push("Keep the note under 500 characters.");
  return errors;
}

export function inviteRequestAddress(input: Pick<InviteRequestInput, "street" | "city" | "state" | "zip">): string {
  const parts: AddressParts = {
    street: input.street,
    city: input.city,
    state: input.state,
    zip: input.zip,
  };
  return formatAddress(parts);
}
