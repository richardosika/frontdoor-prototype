const NICKNAMES: Record<string, string[]> = {
  richard: ["richard", "rich"],
  robert: ["robert", "bob", "rob"],
  william: ["william", "bill", "will"],
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

const LEGAL = new Set(["llc", "inc", "incorporated", "corp", "corporation", "co", "ltd", "limited", "plc", "lp", "llp"]);
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
  const surname = parts[parts.length - 1];
  const given = parts.slice(0, -1).filter((part) => part.includes("-") || part.replace(/[^A-Za-z0-9]/g, "").length >= 3);
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

function personPartHits(text: string, part: string): boolean {
  const pieces = part.split("-").filter(Boolean);
  if (pieces.length > 1) {
    if (wordHit(text, part)) return true;
    return pieces.filter((piece) => piece.length >= 3).every((piece) => wordHit(text, piece));
  }
  const key = part.toLowerCase();
  return (NICKNAMES[key] || [key]).some((alt) => wordHit(text, alt));
}

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

export function distinctiveCompanyTokens(org: string): string[] {
  const kept = tokens(org).filter((token) => !LEGAL.has(token));
  const distinctive = kept.filter((token) => isDistinctiveCompanyToken(token));
  return distinctive.length ? distinctive : kept.filter((token) => token.length >= 5);
}

function suffixesBesideSurname(text: string, parsed: ParsedPersonName): string[] {
  const re = new RegExp(`(?<![A-Za-z0-9-])${parsed.surname.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![A-Za-z0-9-])`, "gi");
  const found: string[] = [];
  for (const match of text.matchAll(re)) {
    const start = match.index ?? 0;
    const before = text.slice(Math.max(0, start - 80), start);
    if (!parsed.given.some((part) => personPartHits(before, part))) continue;
    const after = text.slice(start + match[0].length, start + match[0].length + 16);
    const next = (after.replace(/^[^A-Za-z]+/, "").match(/^[A-Za-z.]+/) || [])[0] || "";
    const suffix = normalizeGenerationalSuffix(next);
    if (suffix) found.push(suffix);
  }
  return found;
}

/**
 * Given name plus surname. When both the application and the page carry a suffix, they have to agree.
 * Jr against III is a mismatch. A page that omits the suffix does not contradict one.
 */
export function personHit(text: string, name: string): PersonHit {
  const parsed = parsePersonName(name);
  if (!parsed || parsed.given.length < 1) return "none";
  if (!parsed.given.every((part) => personPartHits(text, part))) return "none";
  if (!personPartHits(text, parsed.surname)) return "none";
  if (!parsed.suffix) return "match";
  const pageSuffixes = suffixesBesideSurname(text, parsed);
  if (pageSuffixes.includes(parsed.suffix)) return "match";
  if (pageSuffixes.length) return "suffix-mismatch";
  return "match";
}

export function mentionsPerson(text: string, name: string): boolean {
  return personHit(text, name) === "match";
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
  const move = /\b(?:jumps|jumped|jump|joins|joined|joining)\s+(?:to\s+)?([\s\S]{0,90}?)\s+from\s+([\s\S]{0,120})/i.exec(text);
  if (move) {
    const destination = move[1];
    const origin = move[2].split(/[.]/)[0];
    if (mentionsCompany(destination, org)) return false;
    if (mentionsCompany(origin, org)) return true;
  }
  return /\b(?:leaves|left|leaving|departs|departed|departing)\b/i.test(text);
}

function looksLikeGivenName(word: string): boolean {
  if (word.length < 2 || word.length > 20) return false;
  if (word !== word[0].toUpperCase() + word.slice(1).toLowerCase()) return false;
  const particles = new Set(["the", "of", "at", "and", "for", "with", "from", "by", "on", "in", "to", "a", "an"]);
  if (particles.has(word.toLowerCase())) return false;
  const roles = new Set(["ceo", "cfo", "coo", "president", "chairman", "chair", "founder", "chief", "news", "company", "group"]);
  return !roles.has(word.toLowerCase());
}

/** True when every hit is "Givenname Token", as in a different person who shares the surname. */
function surnameOnly(text: string, token: string): boolean {
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

/** Every non-legal word in the firm name, including a short brand and the generic words that complete it. */
export function companyPhraseTokens(org: string): string[] {
  return tokens(org).filter((token) => !LEGAL.has(token) && !STOP.has(token));
}

export function mentionsCompany(text: string, org: string, person = ""): boolean {
  const phrase = companyPhraseTokens(org);
  if (!phrase.length) return false;
  const distinctive = phrase.filter((token) => isDistinctiveCompanyToken(token));
  // "group" or "realty" alone is not a company. Two generic words still have to appear together.
  if (!distinctive.length) {
    if (phrase.length < 2) return false;
    return phrase.every((token) => companyTokenHit(text, token));
  }
  // "CBRE" counts. "CBRE Group" does not match Unum Group, and "Madison Realty Capital" does not match Madison Air Solutions.
  if (!phrase.every((token) => companyTokenHit(text, token))) return false;
  if (distinctive.length === 1 && surnameOnly(text, distinctive[0])) return false;
  void person;
  return true;
}
