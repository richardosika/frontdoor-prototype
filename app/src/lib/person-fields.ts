import { US_STATES } from "@/lib/member-network";

export type AddressParts = {
  street: string;
  city: string;
  state: string;
  zip: string;
};

const STATE = /^[A-Za-z]{2}$/;
const ZIP = /^\d{5}(?:-\d{4})?$/;

export function isUsState(value: string): boolean {
  return (US_STATES as readonly string[]).includes(value.trim().toUpperCase());
}

/** Five digits, or ZIP+4. 00000 is not a ZIP. */
export function zipIssue(value: string): string | null {
  const zip = value.trim();
  if (!ZIP.test(zip)) return "Enter a ZIP code.";
  if (zip.slice(0, 5) === "00000") return "Enter a real ZIP code.";
  return null;
}

export function stateIssue(value: string): string | null {
  const state = value.trim();
  if (!STATE.test(state)) return "Enter a two-letter state.";
  if (!isUsState(state)) return "Enter a real two-letter US state.";
  return null;
}

export function joinName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.replace(/\s+/g, " ").trim();
}

/** The first-name field as entered. A stored full name keeps every word except the last. */
export function givenNameFrom(givenName: string | null | undefined, fullName = ""): string {
  const given = (givenName || "").replace(/\s+/g, " ").trim();
  if (given) return given;
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "there";
  if (parts.length === 1) return parts[0];
  return parts.slice(0, -1).join(" ");
}

export function validatePersonName(firstName: string, lastName: string): string[] {
  const errors: string[] = [];
  if (firstName.trim().length < 1) errors.push("Enter your first name.");
  if (lastName.trim().length < 1) errors.push("Enter your last name.");
  return errors;
}

export function validateAddress(input: AddressParts): string[] {
  const errors: string[] = [];
  if (input.street.trim().length < 2) errors.push("Enter your street address.");
  if (input.city.trim().length < 2) errors.push("Enter your city.");
  const state = stateIssue(input.state);
  const zip = zipIssue(input.zip);
  if (state) errors.push(state);
  if (zip) errors.push(zip);
  return errors;
}

export function formatAddress(input: AddressParts): string {
  return `${input.street.trim()}, ${input.city.trim()}, ${input.state.trim().toUpperCase()} ${input.zip.trim()}`;
}

export function validatePhone(phone: string): string | null {
  if (phone.trim().replace(/\D/g, "").length < 7) return "Enter a contact phone number with at least 7 digits.";
  return null;
}
