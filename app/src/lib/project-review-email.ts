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
      subject: p("{project} is approved").replace("{project}", input.projectName),
      text: [
        hello,
        p("Good news: {project} is approved. It is now open to members in the categories it is seeking, and you can start building your team.").replace("{project}", name),
        input.note ? `${p("Note from the reviewer:")} ${input.note}` : "",
        `${p("Find your team")}\n${input.link}`,
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

/** The alert and email everyone involved in a project gets when its owner changes a document. */
export function projectDocumentEmail(input: {
  locale: Locale;
  change: "added" | "replaced" | "removed";
  ownerName: string;
  projectName: string;
  documentTitle: string;
  link: string;
}): { subject: string; text: string } {
  const p = (text: string) => phrase(input.locale, text);
  const what =
    input.change === "added" ? p("added a document") : input.change === "replaced" ? p("replaced a document") : p("removed a document");
  return {
    subject: `${p("Project update")}: ${input.projectName}`,
    text: [
      `${input.ownerName} ${what}: “${input.documentTitle}”.`,
      `${p("Project")}: ${input.projectName}`,
      p("You are getting this because you are involved in this project on Private Floor."),
      `${p("Open the project")}\n${input.link}`,
    ].join("\n\n"),
  };
}
