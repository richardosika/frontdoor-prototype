import { webUrlIssue } from "@/lib/web-url";
import { stateIssue, validatePhone, zipIssue } from "@/lib/person-fields";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HTTP = /^https?:\/\//i;

export const DETAILS_CONTINUE_MESSAGE = "Please complete the highlighted fields.";

export type ApplyDetailsInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  org: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  linkedinUrl: string;
  website: string;
  socialLinks: string;
  referenceEmail: string;
  referenceEmail2: string;
  statement: string;
};

export type ApplyDetailsIssue = {
  id: string;
  label: string;
  message: string;
};

function httpMessage(label: string, value: string): string | null {
  return webUrlIssue(label, value);
}

/** Required details, in form order, plus optional fields that were filled in incorrectly. */
export function applyDetailsIssues(input: ApplyDetailsInput): ApplyDetailsIssue[] {
  const issues: ApplyDetailsIssue[] = [];
  const add = (id: string, label: string, message: string | null) => {
    if (message) issues.push({ id, label, message });
  };

  add("apply-first-name", "first name", input.firstName.trim().length < 1 ? "Enter your first name." : null);
  add("apply-last-name", "last name", input.lastName.trim().length < 1 ? "Enter your last name." : null);
  add("apply-email", "email", EMAIL.test(input.email.trim()) ? null : "Enter a valid email.");
  if (input.password.length < 8) add("apply-password", "password", "Password must be at least 8 characters.");
  else if (input.password.length > 72) add("apply-password", "password", "Password must be 72 characters or fewer.");
  add("apply-company", "company", input.org.trim().length < 2 ? "Enter your company or firm." : null);
  add("apply-street", "street", input.street.trim().length < 2 ? "Enter your street address." : null);
  add("apply-city", "city", input.city.trim().length < 2 ? "Enter your city." : null);
  add("apply-state", "state", stateIssue(input.state));
  add("apply-zip", "ZIP", zipIssue(input.zip));
  add("apply-phone", "contact phone", validatePhone(input.phone));
  add("apply-linkedin", "LinkedIn URL", httpMessage("LinkedIn URL", input.linkedinUrl));
  add("apply-website", "website", httpMessage("Website", input.website));
  const social = input.socialLinks
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
  add("apply-social", "social links", social.some((item) => !HTTP.test(item)) ? "Social links must start with http." : null);
  add(
    "apply-reference-1",
    "reference email",
    input.referenceEmail.trim() && !EMAIL.test(input.referenceEmail.trim()) ? "Leave reference emails blank, or enter a valid email." : null,
  );
  add(
    "apply-reference-2",
    "second reference email",
    input.referenceEmail2.trim() && !EMAIL.test(input.referenceEmail2.trim())
      ? "Leave reference emails blank, or enter a valid email."
      : null,
  );
  add("apply-statement", "track record", input.statement.length > 1000 ? "Keep the statement under 1000 characters." : null);
  return issues;
}

export function stillNeeded(issues: ApplyDetailsIssue[]): string {
  if (!issues.length) return "";
  return `Still needed: ${issues.map((issue) => issue.label).join(", ")}`;
}
