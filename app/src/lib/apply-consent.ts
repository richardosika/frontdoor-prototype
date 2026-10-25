import { DUES_ANNUAL_NOTE, DUES_TABLE } from "@/lib/dues";

export const BEFORE_SUBMIT_INTRO = "Private Floor is a vetted network. To review your application:";

export type ConsentSection = {
  id: string;
  label: string;
  title: string;
  body: string;
  dues?: boolean;
};

/** Summaries of the applicant-consent draft. The legal pages keep the full text. */
export const CONSENT_SECTIONS: ConsentSection[] = [
  {
    id: "review",
    label: "How we review",
    title: "Public checks only",
    body: "We run automated checks using free, public information only: your email and company domain (including public domain registration information), your company's public website, government sanctions and watchlists (such as OFAC lists), SEC EDGAR filings, public court records, public web and news search, and profile pages that are publicly visible without logging in. If you upload a business card, we read its text and compare it with your application, and we also check for duplicate or fraudulent applications.",
  },
  {
    id: "person",
    label: "A person decides",
    title: "Every decision is reviewed",
    body: "The checks produce an internal score, summary, and recommendation, and a Private Floor administrator reviews them and makes every membership decision. No decision is made by automated means alone.",
  },
  {
    id: "status",
    label: "What you'll see",
    title: "Status, not the report",
    body: "We will tell you your status: Verification in progress, More information needed, Approved, or Declined, and we do not share the internal report or give reasons. If you think we relied on wrong information, email connect@privatefloorclub.com with the subject line “Verification Review.”",
  },
  {
    id: "report",
    label: "Not a consumer report",
    title: "Membership only",
    body: "Private Floor is not a consumer reporting agency. These checks are used only to decide membership in Private Floor, never for credit, employment, housing, or insurance decisions.",
  },
  {
    id: "optional",
    label: "Optional items",
    title: "Nothing extra is required",
    body: "A business card and references are optional. We may email references only to confirm they know you, and we never ask for government ID or license numbers.",
  },
  {
    id: "privacy",
    label: "Privacy",
    title: "Messages stay inside",
    body: "All member communication happens inside the Platform, and other members do not see your email, phone, LinkedIn, or business card. Moderators and administrators can read messages for safety and verification, and every access is logged.",
  },
  {
    id: "dues",
    label: "Dues",
    title: "A flat annual fee",
    body: DUES_ANNUAL_NOTE,
    dues: true,
  },
  {
    id: "records",
    label: "Electronic records",
    title: "Documents and your signature",
    body: "You agree to receive our documents and notices electronically and that checking the boxes below is your electronic signature.",
  },
  {
    id: "language",
    label: "Language",
    title: "English governs",
    body: "The English version of our legal documents governs over any translation.",
  },
];

export const CONSENT_LEGAL_LINKS = [
  ["/legal/terms", "Terms"],
  ["/legal/privacy", "Privacy"],
  ["/legal/disclosures", "Disclosures"],
  ["/legal/verification-policy", "Verification Policy"],
  ["/legal/applicant-consent", "Applicant consent"],
  ["/legal/guidelines", "Guidelines"],
] as const;

export { DUES_TABLE };
