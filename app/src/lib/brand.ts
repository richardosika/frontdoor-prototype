/** Product name. Change this constant to rename the app. */
export const BRAND = {
  name: "Private Floor",
  club: "Private Floor Club",
  tagline: "The vetted circle for real estate deal teams.",
  /** Two-line text wordmark. */
  mark: ["Private", "Floor"],
  legalName: "Private Floor Club LLC",
  formation: "a New Jersey limited liability company [to be formed]",
  address: "299 Market Street, Saddle Brook, NJ 07663",
  contactEmail: "connect@privatefloorclub.com",
  contactPhone: "800-399-3745",
  owner: "Richard Osika",
} as const;

/** Every outbound notice on this test build goes here, never to the applicant. */
export function noticeTestRecipient(): string {
  const configured = process.env.NOTICE_TEST_RECIPIENT?.trim();
  return configured || "rich@privatefloorclub.com";
}
