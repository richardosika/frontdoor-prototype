import { readFileSync } from "node:fs";
import path from "node:path";
import { memberFacingLegal } from "@/lib/legal";

export type HelpChunk = {
  id: string;
  title: string;
  body: string;
  source: string;
  kind: "faq" | "doc";
  restricted: boolean;
};

export type FaqArticle = { slug: string; title: string; body: string; published?: boolean };

const DOC_FILES: { file: string; source: string }[] = [
  { file: "terms.md", source: "Terms of Use" },
  { file: "guidelines.md", source: "Community Guidelines" },
  { file: "verification-policy.md", source: "Verification Policy" },
  { file: "membership-dues.md", source: "Membership Dues and Refund Terms" },
  { file: "seeking-raising.md", source: "Seeking and Raising Post Rules" },
  { file: "deal-room-nda.md", source: "Deal Room NDA" },
];

const RESTRICTED_HEADING = /automated checks|internal report contains|key points/i;
const RESTRICTED_BODY = /\b(ofac|courtlistener|edgar|duckduckgo|wikidata|gdelt|\bsdn\b|sanctions lists?|watchlists?)\b/i;

export const DEFAULT_FAQ: FaqArticle[] = [
  {
    slug: "signup",
    title: "How signup works",
    body: "Private Floor is a private network where every member is personally reviewed. Anyone can request to join, and every request is personally reviewed. Use the invite code on Apply, with your real name, role, company, and location. A business card is optional. Private Floor does not ask for a government ID. Two consent boxes start unchecked, and both are required. After you submit, keep the status link. That page is where you reply if a Private Floor administrator asks for more information.",
  },
  {
    slug: "verification",
    title: "What you see about verification",
    body: "A Private Floor administrator reviews every application. Automation only recommends and does not approve anyone. You see Verified or Verification in progress. You do not see a score, a source list, or an internal checklist. Verified is a limited review, not a guarantee or an endorsement. A decline does not include reasons. Email connect@privatefloorclub.com with the subject Verification Review if you think something is wrong.",
  },
  {
    slug: "dues",
    title: "Annual dues and refunds",
    body: "Developers, investors and limited partners, family offices, and lenders pay no annual dues and become active when approved. General contractors: $2,400 per year. Brokers: $1,800 per year. Attorneys and advisors: $1,200 per year. Annual dues are a flat fee, billed once a year, and due only after approval. They are never based on a deal. During testing, Pay dues can be a labelled simulated payment. No card number is stored. A founding-member waiver is applied by an administrator and is not automatic. Refund wording lives on the Membership Dues and Refund Terms page, which is still a draft.",
  },
  {
    slug: "posts",
    title: "Seeking and raising posts",
    body: "Members can post updates and seeking or raising notes. A seeking or raising post needs the rules acknowledgement. Do not include offering terms, a target return, a guarantee, past performance, or a subscription. Those words hold the post for a Private Floor administrator. The hold is not legal advice and is not approval of an offering. Nothing on Private Floor is an offer to sell a security.",
  },
  {
    slug: "introductions",
    title: "Introductions and messages",
    body: "An introduction comes before a message thread. The member who receives it accepts or declines. Messages stay inside Private Floor. Other members never see your email, phone, or LinkedIn. You can block a member and you can report a message. A Private Floor administrator reviews reports.",
  },
  {
    slug: "deal-rooms",
    title: "Deal rooms",
    body: "The member who created a deal room decides who may enter. You acknowledge the Deal Room NDA first. Private Floor stores the document version and the time, and stores document names rather than the file bytes. The owner can remove access. Deal-room materials are confidential.",
  },
  {
    slug: "decisions",
    title: "Who decides a membership",
    body: "A Private Floor administrator decides every application. Help cannot say whether an application will be approved, declined, or asked for more information. Use the status link to see the current status. For a person, email connect@privatefloorclub.com.",
  },
  {
    slug: "limits",
    title: "What Help will not answer",
    body: "Help answers from Private Floor's pages only. It does not give legal, tax, or investment advice. It does not reveal verification scores, sources, or internal notes. It does not promise an outcome. If a question is outside those pages, email connect@privatefloorclub.com.",
  },
  {
    slug: "gc-dues",
    title: "What a general contractor pays for membership",
    body: "General contractors: $2,400 per year. Brokers: $1,800 per year. Attorneys and advisors: $1,200 per year. Developers, investors and limited partners, family offices, and lenders are free. Annual dues are a flat fee, billed once a year, and due only after a Private Floor administrator approves the application. They are never based on a deal.",
  },
  {
    slug: "post-held",
    title: "Why a post was held for review",
    body: "A seeking or raising post is held when it includes offering terms, a target return, a guarantee, past performance, or a subscription. A Private Floor administrator reviews that hold. The hold is not legal advice and is not approval of an offering. Nothing on Private Floor is an offer to sell a security.",
  },
  {
    slug: "request-introduction",
    title: "How to request an introduction",
    body: "Request an introduction from the directory. Write a short note. The other member accepts or declines inside Private Floor. Messaging opens after they accept. Other members never see your email, phone, or LinkedIn.",
  },
];

export function isRestrictedChunk(heading: string, body: string): boolean {
  return RESTRICTED_HEADING.test(heading) || RESTRICTED_BODY.test(body);
}

export function chunkMarkdown(source: string, markdown: string): HelpChunk[] {
  const stripped = markdown.replace(/^\uFEFF?Version:[^\n]*\n+/, "");
  const parts = stripped.split(/\n(?=#{1,3} )/);
  return parts
    .map((part, index) => {
      const heading = part.match(/^#{1,3}\s+(.+)/)?.[1]?.replace(/\*\*/g, "").trim() || source;
      const body = memberFacingLegal(part.replace(/^#{1,3}\s+.+\n+/, "").trim() || part.trim());
      return {
        id: `${source}:${index}`,
        title: heading,
        body,
        source,
        kind: "doc" as const,
        restricted: isRestrictedChunk(heading, part),
      };
    })
    .filter((chunk) => chunk.body.length > 40);
}

export function faqChunks(articles: FaqArticle[]): HelpChunk[] {
  return articles
    .filter((article) => article.published !== false && article.body.trim() && article.title.trim())
    .map((article) => ({
      id: `faq:${article.slug}`,
      title: article.title.trim(),
      body: article.body.trim(),
      source: "FAQ",
      kind: "faq" as const,
      restricted: isRestrictedChunk(article.title, article.body),
    }));
}

export function readHelpDocs(root = process.cwd()): HelpChunk[] {
  const legalDir = path.join(root, "src/content/legal");
  const helpDir = path.join(root, "src/content/help");
  const docs = DOC_FILES.flatMap((doc) => chunkMarkdown(doc.source, readFileSync(path.join(legalDir, doc.file), "utf8")));
  const howTo = chunkMarkdown("How Private Floor works", readFileSync(path.join(helpDir, "how-it-works.md"), "utf8"));
  return [...docs, ...howTo];
}

export function knowledgeChunks(articles: FaqArticle[], root = process.cwd()): HelpChunk[] {
  return [...faqChunks(articles), ...readHelpDocs(root)];
}
