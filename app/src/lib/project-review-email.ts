import type { Locale } from "@/lib/i18n/messages";
import { phrase } from "@/lib/i18n/phrases";
import type { ProjectReview } from "@/lib/project-contact";

/** The email a member gets when staff review a project they submitted. Sent through the branded notice layout. */
export function projectReviewEmail(input: {
  locale: Locale;
  status: Exclude<ProjectReview, "PENDING_REVIEW">;
  firstName: string;
  projectName: string;
  note: string;
  link: string;
}): { subject: string; text: string } {
  const p = (text: string) => phrase(input.locale, text);
  const hello = `${p("Hello")} ${input.firstName},`;
  const name = `“${input.projectName}”`;
  if (input.status === "APPROVED") {
    return {
      subject: p("Your project is approved"),
      text: [
        hello,
        `${name}: ${p("A Private Floor administrator approved your project. It is now listed for members in the categories it is seeking.")}`,
        input.note ? `${p("Note from the reviewer:")} ${input.note}` : "",
        `${p("Open your Ledger")}\n${input.link}`,
      ].filter(Boolean).join("\n\n"),
    };
  }
  if (input.status === "NEEDS_INFO") {
    return {
      subject: p("More information needed for your project"),
      text: [
        hello,
        `${name}: ${p("A Private Floor administrator needs more information before listing your project. Edit the project and submit it again.")}`,
        `${p("Note from the reviewer:")} ${input.note}`,
        `${p("Edit and resubmit")}\n${input.link}`,
      ].join("\n\n"),
    };
  }
  return {
    subject: p("Your project was not approved"),
    text: [
      hello,
      `${name}: ${p("A Private Floor administrator did not approve this project for listing.")}`,
      input.note ? `${p("Reason:")} ${input.note}` : "",
      `${p("Open your Ledger")}\n${input.link}`,
    ].filter(Boolean).join("\n\n"),
  };
}

/** The email the other member gets when someone contacts them about a project. */
export function projectContactEmail(locale: Locale, link: string): { subject: string; text: string } {
  const p = (text: string) => phrase(locale, text);
  return {
    subject: p("A member contacted you about a project"),
    text: `${p("A member contacted you about a project on Private Floor. Accept or decline on your Ledger.")}\n\n${p("Open your Ledger")}\n${link}`,
  };
}
