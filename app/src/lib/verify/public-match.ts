import { stripQaOrg } from "@/lib/verify/qa-marker";

const NICKNAMES: Record<string, string[]> = {
  richard: ["richard", "rich"],
  robert: ["robert", "bob", "rob"],
  william: ["william", "bill", "will", "willy"],
  willy: ["willy", "william", "bill", "will"],
  will: ["will", "william", "bill", "willy"],
  james: ["james", "jim"],
  michael: ["michael", "mike"],
  christopher: ["christopher", "chris"],
  anthony: ["anthony", "tony"],
  joseph: ["joseph", "joe"],
  thomas: ["thomas", "tom"],
  daniel: ["daniel", "dan"],
  david: ["david", "dave"],
  stephen: ["stephen", "steve"],
  steven: ["steven", "steve"],
  jeffrey: ["jeffrey", "jeff"],
};

const LEGAL = new Set(["llc", "inc", "incorporated", "corp", "corporation", "co", "ltd", "limited", "plc", "lp", "llp", "pllc", "pc"]);
/** A job title after the brand is not a different firm. "CBRE CEO" is still CBRE. "Starwood Capital" is not. */
const TITLE_WORDS = new Set(["ceo", "president", "chairman", "chairwoman", "chairperson", "founder", "cofounder", "principal", "partner"]);
/** Four-letter words that show up in too many firm names to identify one company. "toll" is not in this set. */
const SHORT_GENERIC = new Set([
  "home",
  "fund",
  "bank",
  "city",
  "east",
  "west",
  "land",
  "park",
  "hill",
  "view",
  "gold",
  "star",
  "peak",
  "rise",
  "core",
  "lake",
  "rock",
  "wood",
  "ford",
  "club",
  "sons",
  "bros",
]);
const GENERIC = new Set([
  "construction",
  "services",
  "service",
  "general",
  "contracting",
  "contractor",
  "group",
  "holdings",
  "holding",
  "company",
  "companies",
  "the",
  "and",
  "development",
  "developers",
  "realty",
  "properties",
  "property",
  "management",
  "partners",
  "partner",
  "associates",
  "solutions",
  "enterprises",
  "related",
  "capital",
  "global",
  "american",
  "national",
  "financial",
  "international",
  "united",
  "real",
  "estate",
  "trust",
  "usa",
]);

function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/&amp;/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 2);
}

const PLACE_AFTER = "island|beach|drive|dr|lane|blvd|boulevard|road|rd|street|st|avenue|ave";

/** A letter, digit, or hyphen on either side is still the same word. "turner" does not match "page-turner". */
export function wordHit(text: string, token: string): boolean {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![A-Za-z0-9-])${escaped}(?![A-Za-z0-9-])`, "i").test(text);
}

const GENERATIONAL = new Set(["jr", "sr", "ii", "iii", "iv"]);

/** Jr, Sr, II, III, and IV. "Junior" and "Senior" fold to jr and sr. */
export function normalizeGenerationalSuffix(token: string): string | null {
  const cleaned = token.toLowerCase().replace(/\./g, "").replace(/[^a-z]/g, "");
  if (cleaned === "junior") return "jr";
  if (cleaned === "senior") return "sr";
  return GENERATIONAL.has(cleaned) ? cleaned : null;
}

export type ParsedPersonName = { given: string[]; surname: string; suffix: string | null };

/**
 * Given name, surname, and a generational suffix.
 * The suffix is kept for matching. It is not the surname, so a query can drop Jr without dropping Gilbane.
 */
const NAME_PARTICLES = new Set(["de", "del", "della", "di", "da", "das", "dos", "du", "van", "von", "der", "den", "ten", "ter", "la", "le", "lo", "el"]);

function surnameFromParts(parts: string[]): { given: string[]; surname: string } {
  const surnameParts = [parts[parts.length - 1]];
  let index = parts.length - 2;
  while (index >= 0 && NAME_PARTICLES.has(parts[index].toLowerCase())) {
    surnameParts.unshift(parts[index]);
    index -= 1;
  }
  const given = parts.slice(0, index + 1).filter((part) => part.includes("-") || part.replace(/[^A-Za-z0-9]/g, "").length >= 3);
  return { given, surname: surnameParts.join(" ") };
}

export function parsePersonName(name: string): ParsedPersonName | null {
  const parts = name
    .replace(/\b[A-Za-z]\.\s*/g, " ")
    .split(/\s+/)
    .map((part) => part.replace(/^[^A-Za-z0-9-]+|[^A-Za-z0-9-]+$/g, ""))
    .filter((part) => part.replace(/[^A-Za-z0-9]/g, "").length >= 2);
  if (!parts.length) return null;
  let suffix: string | null = null;
  const tail = normalizeGenerationalSuffix(parts[parts.length - 1]);
  if (tail) {
    suffix = tail;
    parts.pop();
  }
  if (!parts.length) return null;
  const { given, surname } = surnameFromParts(parts);
  return { given, surname, suffix };
}

/** Name used in a search query. The suffix token is removed. The surname stays. */
export function personWithoutSuffix(name: string): string {
  const parsed = parsePersonName(name);
  if (!parsed) return name.replace(/\b[A-Za-z]\.\s*/g, " ").replace(/\s+/g, " ").trim();
  return [...parsed.given, parsed.surname].join(" ");
}

/** Surname for a query or a sitemap path. A suffix is never returned in place of the surname. */
export function surnameForSearch(name: string): string {
  return parsePersonName(name)?.surname || "";
}

export type PersonHit = "match" | "suffix-mismatch" | "none";

/**
 * Whole-word hit, including a 4-letter brand such as "cbre" or "toll".
 * Those tokens are not discarded for length. A split-word guess is only for a longer token.
 * "Captiva Island" and "Captiva Dr" are places, not Captiva Development.
 */
function companyTokenHit(text: string, token: string): boolean {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const stripped = text.replace(new RegExp(`(?<![A-Za-z0-9-])${escaped}\\s+(?:${PLACE_AFTER})(?![A-Za-z0-9-])`, "gi"), " ");
  if (wordHit(stripped, token)) return true;
  if (token.length < 8) return false;
  for (let index = 4; index <= token.length - 3; index += 1) {
    const left = token.slice(0, index);
    const right = token.slice(index);
    if (wordHit(stripped, `${left} ${right}`) || new RegExp(`(?<![A-Za-z0-9-])${left}\\s+${right}(?![A-Za-z0-9-])`, "i").test(stripped)) return true;
  }
  return false;
}

export function alternatePersonNames(name: string): string[] {
  const parsed = parsePersonName(name);
  if (!parsed || parsed.given.length < 1) {
    const cleaned = personWithoutSuffix(name);
    return cleaned ? [cleaned] : [];
  }
  const first = parsed.given[0].toLowerCase();
  const surname = parsed.surname.charAt(0).toUpperCase() + parsed.surname.slice(1);
  const full = personWithoutSuffix(name);
  const names = new Set<string>([full]);
  for (const nick of NICKNAMES[first] || []) {
    if (nick === first) continue;
    names.add(`${nick.charAt(0).toUpperCase()}${nick.slice(1)} ${surname}`);
  }
  return [...names];
}

/**
 * Words that distinguish this firm. A common word such as "related" is kept only together with the rest of the name.
 * A 4-letter token is kept when it is not generic ("toll" in "Toll Brothers") so a real short name can match.
 * A single short token still has to be the whole distinctive name; a longer different firm does not fit.
 */
/** A token that can identify one firm. Generic words and legal suffixes never qualify. "toll" does. */
export function isDistinctiveCompanyToken(token: string): boolean {
  return token.length >= 4 && !GENERIC.has(token) && !SHORT_GENERIC.has(token) && !LEGAL.has(token);
}

/** Generic firm words, including short ones such as "bank" and "fund". "sl" is not generic. */
export function isGenericFirmToken(token: string): boolean {
  return GENERIC.has(token) || SHORT_GENERIC.has(token) || LEGAL.has(token);
}

/** A 2- or 3-letter brand such as "bk" or "sl". It is not generic, and it is too short to be a distinctive token. */
export function isShortBrandToken(token: string): boolean {
  return token.length >= 2 && token.length <= 3 && !isGenericFirmToken(token);
}

/**
 * Words that show up in too many firm names to be a search or a parent match by themselves.
 * "building" is one of them. "toll" and "sto" are not.
 */
const STANDALONE_QUERY_GENERIC = new Set([
  "building",
  "construction",
  "development",
  "properties",
  "realty",
  "holdings",
  "partners",
  "capital",
]);

export function isStandaloneGenericQueryToken(token: string): boolean {
  return STANDALONE_QUERY_GENERIC.has(token);
}

/**
 * Generic leftovers for the search query only. Matching still uses GENERIC.
 * "organization" is not a brand by itself, so "Brodsky Organization" must not search as "organization".
 */
const SEARCH_TERM_GENERIC = new Set([
  "organization",
  "group",
  "company",
  "companies",
  "holdings",
  "partners",
  "properties",
  "realty",
  "development",
  "management",
  "associates",
  "enterprises",
  "services",
  "service",
]);

export function isSearchTermGeneric(token: string): boolean {
  return SEARCH_TERM_GENERIC.has(token) || isStandaloneGenericQueryToken(token) || isGenericFirmToken(token);
}

export function distinctiveCompanyTokens(org: string): string[] {
  const kept = tokens(org).filter((token) => !LEGAL.has(token));
  const distinctive = kept.filter((token) => isDistinctiveCompanyToken(token));
  return distinctive.length ? distinctive : kept.filter((token) => token.length >= 5);
}

/**
 * Distinctive firm words that are not the applicant's own name.
 * When the only distinctive token is that short brand ("mack" in "Mack Real Estate Group"),
 * keep the whole firm name. Do not drop the brand and search a generic leftover such as "estate".
 * A 2- or 3-letter brand stays, with the next two words: "bk real estate", not "advisors".
 */
export function companySearchTerm(org: string, person = ""): string {
  org = stripQaOrg(org);
  const phrase = companyPhraseTokens(org);
  if (!phrase.length) return "";
  const parsed = parsePersonName(person);
  const names = new Set(
    [...(parsed?.given || []), parsed?.surname || "", ...tokens(person)]
      .map((part) => part.toLowerCase())
      .filter(Boolean),
  );
  const shortAt = phrase.findIndex((token) => isShortBrandToken(token) && !names.has(token));
  if (shortAt >= 0) return phrase.slice(shortAt, shortAt + 3).join(" ");
  const brand = phrase.filter((token) => isDistinctiveCompanyToken(token));
  const distinctive = brand.filter((token) => !names.has(token) && !isSearchTermGeneric(token));
  // A surname plus only a generic word, such as "Brodsky Organization", stays the whole brand.
  if (distinctive.length) return distinctive.join(" ");
  return phrase.join(" ");
}

/**
 * A discovered LinkedIn URL counts when it is a company page, or an /in/ slug
 * whose given name (or nickname) appears before the surname. "walkerharris" is
 * Walker Harris, not Willy Walker. A URL the applicant typed is not decided here.
 */
/**
 * A LinkedIn company slug has to carry the applicant's distinctive words.
 * gilbane-development-company is not Gilbane Building Company: "building" is missing,
 * so one shared token is not the firm. A one-word slug may be the brand plus a short tail,
 * such as buildprocs for BuildPro. A numeric company id is resolved before this runs.
 */
export function linkedinCompanyMatchesOrg(url: string, org: string): boolean {
  const raw = decodeURIComponent(url.match(/linkedin\.com\/company\/([^/?#]+)/i)?.[1] || "").toLowerCase();
  if (!raw || /^\d+$/.test(raw)) return false;
  const pieces = raw.replace(/\./g, "").split(/[-_]+/).filter(Boolean);
  const slugTokens = pieces.filter((token) => token.length >= 2 && !isGenericFirmToken(token));
  const orgDistinctive = companyPhraseTokens(org).filter((token) => isDistinctiveCompanyToken(token));
  if (!orgDistinctive.length || !slugTokens.length) return false;
  if (pieces.length === 1) {
    const slug = slugTokens[0];
    const lead = orgDistinctive[0];
    return slug === lead || slug.startsWith(lead) || lead.startsWith(slug);
  }
  const pieceSet = new Set(pieces);
  if (orgDistinctive.some((token) => !pieceSet.has(token))) return false;
  const orgSet = new Set(companyPhraseTokens(org));
  const slugDistinctive = slugTokens.filter((token) => isDistinctiveCompanyToken(token));
  return slugDistinctive.length > 0 && slugDistinctive.every((token) => orgSet.has(token));
}

export function linkedinProfileMatchesPerson(url: string, person: string): boolean {
  if (/linkedin\.com\/company\//i.test(url)) return true;
  const slug = decodeURIComponent(url.match(/linkedin\.com\/in\/([^/?#]+)/i)?.[1] || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  if (!slug) return false;
  const parsed = parsePersonName(person);
  if (!parsed?.given.length || !parsed.surname) return false;
  const surname = parsed.surname.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (surname.length < 2) return false;
  const first = parsed.given[0].toLowerCase();
  const givens = new Set([first, ...(NICKNAMES[first] || [])].map((item) => item.toLowerCase().replace(/[^a-z0-9]/g, "")));
  for (const given of givens) {
    if (given.length < 2) continue;
    let from = 0;
    while (from < slug.length) {
      const at = slug.indexOf(given, from);
      if (at < 0) break;
      if (slug.indexOf(surname, at + given.length) >= 0) return true;
      from = at + 1;
    }
  }
  return false;
}

const ALIAS_STOP = new Set(["www", "com", "home", "index", "welcome", "official"]);

/** A domain stem may end in a state code. "twotreesny" is Two Trees, not a second brand. */
const DOMAIN_STATE_TAIL =
  /(?:nyc|ny|nj|dc|ca|tx|fl|il|ma|pa|ct|wa|ga|co|or|az|nc|tn|md|oh|mi|wi|mn|mo|va|al|ak|ar|de|hi|ia|ks|ky|la|me|mt|ne|nv|nh|nm|nd|ok|ri|sc|sd|ut|vt|wv|wy)$/;

/** Distinctive words of the firm, joined. Generic words such as management are left off. */
export function companyNameStem(org: string): string {
  return companyPhraseTokens(org)
    .filter((token) => !isGenericFirmToken(token))
    .join("");
}

/** The domain label is this firm, including a trailing state code such as ny or nyc. */
export function domainMatchesOrgStem(label: string, org: string): boolean {
  const stem = companyNameStem(stripQaOrg(org));
  const compact = label.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!stem || compact.length < 2) return false;
  if (compact === stem) return true;
  const peeled = compact.replace(DOMAIN_STATE_TAIL, "");
  return peeled.length >= 2 && peeled === stem;
}

/** The site's own brand label. jll.com is "jll". A generic label such as "usa" is not a brand. */
export function domainBrand(website: string): string {
  const raw = website.trim();
  if (!raw) return "";
  try {
    const host = new URL(raw.startsWith("http") ? raw : `https://${raw}`).hostname.replace(/^www\./, "").toLowerCase();
    const label = (host.split(".")[0] || "").replace(/[^a-z0-9]/g, "");
    if (label.length < 2 || label.length > 24) return "";
    if (isGenericFirmToken(label) || ALIAS_STOP.has(label)) return "";
    return label;
  } catch {
    return "";
  }
}

function decodeBrand(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** Title, og:site_name, and schema.org Organization name. These are brand strings, not evidence. */
export function pageBrandNames(html: string): string[] {
  const names: string[] = [];
  const title = html.match(/<title[^>]*>([^<]{1,160})<\/title>/i)?.[1] || "";
  const head = decodeBrand(title).split(/\s*[|–—]\s*|\s+-\s+/)[0]?.trim() || "";
  if (head && head.length <= 48 && head.split(/\s+/).length <= 6) names.push(head);
  const og =
    html.match(/<meta\b[^>]*property=["']og:site_name["'][^>]*>/i)?.[0] ||
    html.match(/<meta\b[^>]*name=["']og:site_name["'][^>]*>/i)?.[0] ||
    "";
  const ogContent = og.match(/content=["']([^"']+)["']/i)?.[1];
  if (ogContent) names.push(decodeBrand(ogContent));
  for (const block of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(block[1]) as unknown;
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      for (const node of nodes) {
        if (!node || typeof node !== "object") continue;
        const record = node as { "@type"?: string | string[]; name?: unknown };
        const type = Array.isArray(record["@type"]) ? record["@type"].join(" ") : String(record["@type"] || "");
        if (/organization|corporation|localbusiness/i.test(type) && typeof record.name === "string") names.push(record.name.trim());
      }
    } catch {
      // A broken script is not a brand.
    }
  }
  return names;
}

/**
 * Short brands for this applicant's own site. The legal name is not an alias.
 * An alias hit is a review flag. It does not corroborate.
 */
export function brandAliases(org: string, website: string, html = ""): string[] {
  const legal = new Set(companyPhraseTokens(org));
  const legalCompact = companyPhraseTokens(org).join("");
  const out: string[] = [];
  const add = (value: string) => {
    const compact = value.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (compact.length < 2 || compact.length > 24) return;
    if (legal.has(compact) || compact === legalCompact) return;
    if (isGenericFirmToken(compact) || ALIAS_STOP.has(compact)) return;
    if (domainMatchesOrgStem(compact, org)) return;
    if (mentionsCompany(value, org)) return;
    if (!out.includes(compact)) out.push(compact);
  };
  add(domainBrand(website));
  for (const name of pageBrandNames(html)) add(name);
  return out;
}

/** The alias that appears as its own word. "jll" does not match inside another word. */
export function mentionsBrandAlias(text: string, aliases: string[]): string {
  for (const alias of aliases) {
    if (alias && wordHit(text, alias)) return alias;
  }
  return "";
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Match either case without an /i flag, so a capitalized middle stays case-sensitive. */
function caseFold(token: string): string {
  return token
    .split("")
    .map((char) => (/[a-z]/i.test(char) ? `[${char.toUpperCase()}${char.toLowerCase()}]` : escapeRegExp(char)))
    .join("");
}

function givenPattern(part: string): string {
  const key = part.toLowerCase();
  const alts = [...new Set((NICKNAMES[key] || [key]).map((item) => item.toLowerCase()))];
  return `(?:${alts.map(caseFold).join("|")})`;
}

/** Hyphenated surnames also match with a space. A hyphen beside the word is still the same word. */
function surnamePattern(surname: string): string {
  const pieces = surname.split("-").filter(Boolean);
  const body = pieces.length > 1 ? pieces.map(caseFold).join("[\\s-]+") : caseFold(surname);
  return `(?<![A-Za-z0-9-])${body}(?![A-Za-z0-9-])`;
}

const NAME_MIDDLE = String.raw`(?:\s+(?:[A-Z]\.?|[A-Z][a-z][A-Za-z'-]{0,24})){0,2}`;

type NameSpan = { matchStart: number; surnameStart: number; surnameEnd: number };

/**
 * Given name (or nickname), then up to two initials or capitalized words, then the surname.
 * Commas, ampersands, "and", and "ft." cannot sit between one given name and the surname.
 * A list of given names that shares one surname still counts: "William, Richard and Stephen Mack".
 * "Surname, Given" also counts.
 */
function orderedNameSpans(text: string, parsed: ParsedPersonName): NameSpan[] {
  const surname = surnamePattern(parsed.surname);
  const givenSeq = parsed.given
    .map((part, index) => (index === 0 ? `(?<![A-Za-z0-9-])${givenPattern(part)}` : `${NAME_MIDDLE}\\s+${givenPattern(part)}`))
    .join("");
  const forward = new RegExp(`${givenSeq}${NAME_MIDDLE}\\s+${surname}`, "g");
  const reverse = new RegExp(`${surname}\\s*,?\\s+(?<![A-Za-z0-9-])${givenPattern(parsed.given[0])}(?![A-Za-z0-9-])`, "g");
  const spans: NameSpan[] = [];
  const pushSurname = (start: number, whole: string) => {
    const local = new RegExp(surname, "g");
    let surnameMatch: RegExpExecArray | null = null;
    for (const hit of whole.matchAll(local)) surnameMatch = hit;
    if (!surnameMatch) return;
    const surnameStart = start + (surnameMatch.index ?? 0);
    spans.push({ matchStart: start, surnameStart, surnameEnd: surnameStart + surnameMatch[0].length });
  };
  for (const match of text.matchAll(forward)) pushSurname(match.index ?? 0, match[0]);
  for (const match of text.matchAll(reverse)) {
    const start = match.index ?? 0;
    const surnameMatch = new RegExp(surname).exec(match[0]);
    if (!surnameMatch) continue;
    const surnameStart = start + (surnameMatch.index ?? 0);
    spans.push({ matchStart: start, surnameStart, surnameEnd: surnameStart + surnameMatch[0].length });
  }
  const separator = String.raw`(?:\s*,\s*|\s+[Aa]nd\s+|\s+&\s+)`;
  const list = new RegExp(`(?<![A-Za-z0-9-])((?:[A-Z][a-z]{1,24}${separator})+[A-Z][a-z]{1,24})\\s+${surname}`, "g");
  const wanted = new RegExp(`(?<![A-Za-z0-9-])${givenPattern(parsed.given[0])}(?![A-Za-z0-9-])`);
  for (const match of text.matchAll(list)) {
    const names = match[1] || "";
    if (/\bft\.?\b/.test(names)) continue;
    if (!wanted.test(names)) continue;
    pushSurname(match.index ?? 0, match[0]);
  }
  return spans;
}

function companySpanRanges(text: string, org: string): { start: number; end: number }[] {
  const phrase = companyPhraseTokens(org);
  if (phrase.length < 2) return [];
  const ranges: { start: number; end: number }[] = [];
  for (let length = phrase.length; length >= 2; length -= 1) {
    const prefix = phrase.slice(0, length);
    const body = `(?<![A-Za-z0-9-])${prefix.map((token) => tokenBody(token)).join(PHRASE_GAP)}(?![A-Za-z0-9-])`;
    for (const match of text.matchAll(new RegExp(body, "g"))) {
      const start = match.index ?? 0;
      ranges.push({ start, end: start + match[0].length });
    }
  }
  return ranges;
}

function suffixAfter(text: string, index: number): string | null {
  const after = text.slice(index, index + 16);
  const next = (after.replace(/^[^A-Za-z]+/, "").match(/^[A-Za-z.]+/) || [])[0] || "";
  return normalizeGenerationalSuffix(next);
}

/**
 * The firm name contains this applicant's full name, in order.
 * "Joshua Stein PLLC" contains Joshua Stein. "Rudin Management Company" does not contain William Rudin.
 */
export function firmContainsApplicantName(org: string, person: string): boolean {
  const parsed = parsePersonName(person);
  if (!parsed || parsed.given.length < 1) return false;
  const phrase = companyPhraseTokens(org);
  const name = [...parsed.given.map((part) => part.toLowerCase()), parsed.surname.toLowerCase()];
  if (phrase.length < name.length) return false;
  for (let index = 0; index <= phrase.length - name.length; index += 1) {
    if (name.every((token, offset) => phrase[index + offset] === token)) return true;
  }
  return false;
}

const NAME_TITLES = new Set(["attorney", "lawyer", "counsel", "esq", "mr", "mrs", "ms", "dr", "hon"]);

/**
 * A third-party page can name a self-named lawyer when the full name is more than a given name and a surname.
 * "Adam Leitman Bailey" is that name. "Joshua Stein" is a common pair and stays inside the company span
 * unless the page is the firm's own site. "Mark Joshua Stein" is still a different person.
 */
function thirdPartySelfNamedCounts(_text: string, _org: string, parsed: ParsedPersonName): boolean {
  return parsed.given.length >= 2;
}

function otherGivenImmediatelyBefore(text: string, matchStart: number, parsed: ParsedPersonName): boolean {
  const previous = text.slice(0, matchStart).match(/([A-Za-z][A-Za-z'-]*)\s+$/);
  if (!previous) return false;
  const word = previous[1];
  if (!/^[A-Z]/.test(word)) return false;
  const lower = word.toLowerCase().replace(/[^a-z'-]/g, "");
  if (lower.length < 3) return false;
  if (parsed.given.some((part) => part.toLowerCase() === lower)) return false;
  if (TITLE_WORDS.has(lower) || NAME_TITLES.has(lower) || LEGAL.has(lower) || STOP.has(lower)) return false;
  return true;
}

/**
 * Given name plus surname, in that order. When both the application and the page carry a suffix, they have to agree.
 * Jr against III is a mismatch. A page that omits the suffix does not contradict one.
 * A surname that only occurs inside the company name does not count.
 * On the firm's own site, or the person's own LinkedIn profile, the firm name may be the person's name.
 * That occurrence still counts for the person. A different given name in front of it does not.
 */
export function personHit(text: string, name: string, org = "", options?: { ownFirm?: boolean }): PersonHit {
  const parsed = parsePersonName(name);
  if (!parsed || parsed.given.length < 1) return "none";
  const companyRanges = org ? companySpanRanges(text, org) : [];
  const ownFirm = Boolean(options?.ownFirm) && firmContainsApplicantName(org, name);
  const thirdPartyFirm = !options?.ownFirm && firmContainsApplicantName(org, name) && thirdPartySelfNamedCounts(text, org, parsed);
  const spans = orderedNameSpans(text, parsed).filter((span) => {
    const inside = companyRanges.some((range) => span.surnameStart >= range.start && span.surnameStart < range.end);
    if (!inside) return true;
    if (otherGivenImmediatelyBefore(text, span.matchStart, parsed)) return false;
    return ownFirm || thirdPartyFirm;
  });
  if (!spans.length) return "none";
  if (!parsed.suffix) return "match";
  const suffixes = spans.map((span) => suffixAfter(text, span.surnameEnd)).filter((item): item is string => Boolean(item));
  if (suffixes.includes(parsed.suffix)) return "match";
  if (suffixes.length) return "suffix-mismatch";
  return "match";
}

export function mentionsPerson(text: string, name: string, org = ""): boolean {
  return personHit(text, name, org) === "match";
}

function formerOrEx(text: string, org: string): boolean {
  const phrase = companyPhraseTokens(org);
  const token = phrase.find((part) => isDistinctiveCompanyToken(part)) || phrase[0];
  if (!token) return false;
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b(?:former|ex-)(?:[\\s\\S]{0,48})\\b${escaped}\\b`, "i").test(text);
}

/**
 * A headline that places the person in a past role at this company.
 * "jump to Newmark from Cushman" is a departure from Cushman and a join at Newmark.
 */
export function leftTheCompany(text: string, org: string): boolean {
  if (!org.trim() || !mentionsCompany(text, org)) return false;
  if (formerOrEx(text, org)) return true;
  const explicit = /\b(?:leaves|left|leaving|departs|departed|departing|retiring|retires|retired)\b|\b(?:steps|stepped|stepping) down\b|\bto (?:retire|step down)\b|\btaking a step back\b/i.test(text);
  const joiningLawsuit = /\b(?:joins?|joined|joining)\b/i.test(text) && /\blawsuits?\b/i.test(text);
  if (joiningLawsuit) return explicit;
  const move = /\b(?:jumps|jumped|jump|joins|joined|joining)\s+(?:to\s+)?([\s\S]{0,90}?)\s+from\s+([\s\S]{0,120})/i.exec(text);
  if (move) {
    const destination = move[1];
    const origin = move[2].split(/[.]/)[0];
    const originIsTitle = /^(?:the\s+)?(?:ceo|cfo|coo|president|chairman|chairwoman|chairperson|founder|chief)\b/i.test(origin.trim());
    if (!originIsTitle) {
      if (mentionsCompany(destination, org)) return false;
      if (mentionsCompany(origin, org)) return true;
    }
  }
  return explicit;
}

function looksLikeGivenName(word: string): boolean {
  if (word.length < 2 || word.length > 20) return false;
  if (word !== word[0].toUpperCase() + word.slice(1).toLowerCase()) return false;
  const particles = new Set(["the", "of", "at", "and", "for", "with", "from", "by", "on", "in", "to", "a", "an"]);
  if (particles.has(word.toLowerCase())) return false;
  const roles = new Set(["ceo", "cfo", "coo", "president", "chairman", "chair", "founder", "chief", "news", "company", "group"]);
  return !roles.has(word.toLowerCase());
}

/**
 * True when every hit is "Givenname Token", as in a different person who shares the surname.
 * A hit inside the firm's own name is the company. "Mack Real Estate" is not surname-only.
 */
/** "Torcon Inc" is the firm. The word before it is the person's surname, not a different given name. */
function followedByLegalSuffix(text: string, token: string): boolean {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `(?<![A-Za-z0-9-])${escaped}(?![A-Za-z0-9-])\\s+(?:inc|incorporated|llc|llp|pllc|corp|corporation|co|ltd|limited|pc|lp)\\b`,
    "i",
  ).test(text);
}

function surnameOnly(text: string, token: string, org = ""): boolean {
  const phrase = companyPhraseTokens(org);
  if (phrase.length >= 2 && phrase.includes(token) && consecutivePhrase(text, phrase)) return false;
  if (followedByLegalSuffix(text, token)) return false;
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const all = text.match(new RegExp(`(?<![A-Za-z0-9-])${escaped}(?![A-Za-z0-9-])`, "gi")) || [];
  if (!all.length) return false;
  let nameHits = 0;
  const pattern = new RegExp(`(?<![A-Za-z0-9-])([A-Za-z]+)["']?\\s+["']?${escaped}(?![A-Za-z0-9-])`, "gi");
  for (const match of text.matchAll(pattern)) {
    if (looksLikeGivenName(match[1])) nameHits += 1;
  }
  return nameHits > 0 && nameHits >= all.length;
}

const STOP = new Set(["the", "and", "of", "for", "at"]);

/** A city used as a firm word. "Bristol" alone is not Bristol Development, and "Madison" alone is not Madison Realty Capital. */
const PLACE_BRAND = new Set([
  "bristol",
  "madison",
  "lincoln",
  "newark",
  "trenton",
  "hackensack",
  "dallas",
  "houston",
  "austin",
  "boston",
  "chicago",
  "denver",
  "phoenix",
  "atlanta",
  "seattle",
  "portland",
  "orlando",
  "tampa",
  "miami",
  "brooklyn",
  "manhattan",
  "jersey",
  "philadelphia",
  "baltimore",
]);

/** Every non-legal word in the firm name, including a short brand and the generic words that complete it. */
export function companyPhraseTokens(org: string): string[] {
  return tokens(org).filter((token) => !LEGAL.has(token) && !STOP.has(token));
}

const PHRASE_GAP = `[\\s,.'’:"&/+-]+`;

function tokenBody(token: string): string {
  const folded = `${caseFold(token)}(?:'s)?`;
  if (token.length < 8) return folded;
  const splits = [folded];
  for (let index = 4; index <= token.length - 3; index += 1) {
    const left = caseFold(token.slice(0, index));
    const right = caseFold(token.slice(index));
    splits.push(`${left}\\s+${right}(?:'s)?`);
  }
  return `(?:${splits.join("|")})`;
}

function consecutivePhrase(text: string, prefix: string[]): boolean {
  if (prefix.length < 2) return false;
  // The hyphen in "Kennedy-Wilson" may separate this firm's words. The hyphen in "page-turner" still blocks a different word.
  return new RegExp(`(?<![A-Za-z0-9-])${prefix.map(tokenBody).join(PHRASE_GAP)}(?![A-Za-z0-9-])`).test(text);
}

/**
 * Two or more words have to appear in order, next to each other.
 * "Starwood Property" matches Starwood Property Trust. "Starwood Capital" does not.
 * A single-token firm keeps a whole-word match.
 */
export function mentionsCompany(text: string, org: string, person = ""): boolean {
  const phrase = companyPhraseTokens(org);
  if (!phrase.length) return false;
  const distinctive = phrase.filter((token) => isDistinctiveCompanyToken(token));
  if (phrase.length === 1) {
    const shortBrand = isShortBrandToken(phrase[0]);
    if (!distinctive.length && !shortBrand) return false;
    if (!companyTokenHit(text, phrase[0])) return false;
    if (surnameOnly(text, phrase[0], org)) return false;
    void person;
    return true;
  }
  const firstDistinctive = distinctive[0] || phrase[0];
  for (let length = phrase.length; length >= 2; length -= 1) {
    const prefix = phrase.slice(0, length);
    if (!prefix.includes(firstDistinctive)) continue;
    if (consecutivePhrase(text, prefix)) return true;
  }
  // "trust" and "realty" are not required. "Vornado stock" is Vornado Realty Trust.
  // "Starwood Capital" is a different firm, and "Starwood's SREIT" is a different product.
  if (distinctive.length === 1 && distinctive[0] === phrase[0] && !PLACE_BRAND.has(distinctive[0]) && brandMention(text, distinctive[0], phrase, org, person)) return true;
  return false;
}

/** "Vornado's Steve" is this firm. "Starwood's SREIT" is a different product. */
function nextIsPersonName(word: string, person: string): boolean {
  const lower = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!lower || !person.trim()) return false;
  for (const name of alternatePersonNames(person)) {
    for (const part of name.toLowerCase().split(/\s+/)) {
      if (part === lower) return true;
    }
  }
  return false;
}

function brandMention(text: string, brand: string, phrase: string[], org: string, person: string): boolean {
  if (!companyTokenHit(text, brand) || surnameOnly(text, brand, org)) return false;
  const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const hits = text.matchAll(new RegExp(`(?<![A-Za-z0-9-])${escaped}(?:'s)?(?![A-Za-z0-9-])`, "gi"));
  for (const match of hits) {
    const after = text.slice((match.index ?? 0) + match[0].length);
    const next = after.match(/^[\s,.'’:"&/+-]+([A-Za-z][A-Za-z0-9'-]*)/);
    if (!next) return true;
    const word = next[1];
    const lower = word.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!lower || phrase.includes(lower) || LEGAL.has(lower) || TITLE_WORDS.has(lower)) return true;
    // "Vornado stock" is this firm. "Madison Air" and "Starwood Capital" name a different one.
    // A capitalized next word is a different firm, unless it is this person's name: "Vornado's Steve Roth".
    if (word[0] === word[0].toUpperCase()) {
      if (nextIsPersonName(word, person)) return true;
      continue;
    }
    if (isGenericFirmToken(lower)) continue;
    return true;
  }
  return false;
}
