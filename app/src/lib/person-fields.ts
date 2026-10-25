export type AddressParts = {
  street: string;
  city: string;
  state: string;
  zip: string;
};

const STATE = /^[A-Za-z]{2}$/;
const ZIP = /^\d{5}(?:-\d{4})?$/;

export function joinName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.replace(/\s+/g, " ").trim();
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
  if (!STATE.test(input.state.trim())) errors.push("Enter a two-letter state.");
  if (!ZIP.test(input.zip.trim())) errors.push("Enter a ZIP code.");
  return errors;
}

export function formatAddress(input: AddressParts): string {
  return `${input.street.trim()}, ${input.city.trim()}, ${input.state.trim().toUpperCase()} ${input.zip.trim()}`;
}

export function validatePhone(phone: string): string | null {
  if (phone.trim().replace(/\D/g, "").length < 7) return "Enter a contact phone number with at least 7 digits.";
  return null;
}
