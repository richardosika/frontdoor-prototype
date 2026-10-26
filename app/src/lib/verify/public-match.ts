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

export function distinctiveCompanyTokens(org: string): string[] {
  const kept = tokens(org).filter((token) => !LEGAL.has(token));
  const distinctive = kept.filter((token) => isDistinctiveCompanyToken(token));
  return distinctive.length ? distinctive : kept.filter((token) => token.length >= 5);
}

/** Distinctive firm words that are not the applicant's own name. Otherwise the full phrase, never one generic leftover. */
export function companySearchTerm(org: string, person = ""): string {
  const phrase = companyPhraseTokens(org);
  if (!phrase.length) return "";
  const parsed = parsePersonName(person);
  const names = new Set(
    [...(parsed?.given || []), parsed?.surname || "", ...tokens(person)]
      .map((part) => part.toLowerCase())
      .filter(Boolean),
  );
  const distinctive = phrase.filter((token) => isDistinctiveCompanyToken(token) && !names.has(token));
  if (distinctive.length) return distinctive.join(" ");
  return phrase.join(" ");
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

type NameSpan = { surnameStart: number; surnameEnd: number };

/**
 * Given name (or nickname), then up to two initials or capitalized words, then the surname.
 * Commas, ampersands, "and", and "ft." cannot sit between them. "Surname, Given" also counts.
 */
function orderedNameSpans(text: string, parsed: ParsedPersonName): NameSpan[] {
  const surname = surnamePattern(parsed.surname);
  const givenSeq = parsed.given
    .map((part, index) => (index === 0 ? `(?<![A-Za-z0-9-])${givenPattern(part)}` : `${NAME_MIDDLE}\\s+${givenPattern(part)}`))
    .join("");
  const forward = new RegExp(`${givenSeq}${NAME_MIDDLE}\\s+${surname}`, "g");
  const reverse = new RegExp(`${surname}\\s*,?\\s+(?<![A-Za-z0-9-])${givenPattern(parsed.given[0])}(?![A-Za-z0-9-])`, "g");
  const spans: NameSpan[] = [];
  for (const match of text.matchAll(forward)) {
    const start = match.index ?? 0;
    const local = new RegExp(surname, "g");
    let surnameMatch: RegExpExecArray | null = null;
    for (const hit of match[0].matchAll(local)) surnameMatch = hit;
    if (!surnameMatch) continue;
    const surnameStart = start + (surnameMatch.index ?? 0);
    spans.push({ surnameStart, surnameEnd: surnameStart + surnameMatch[0].length });
  }
  for (const match of text.matchAll(reverse)) {
    const start = match.index ?? 0;
    const surnameMatch = new RegExp(surname, "i").exec(match[0]);
    if (!surnameMatch) continue;
    const surnameStart = start + (surnameMatch.index ?? 0);
    spans.push({ surnameStart, surnameEnd: surnameStart + surnameMatch[0].length });
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
 * Given name plus surname, in that order. When both the application and the page carry a suffix, they have to agree.
 * Jr against III is a mismatch. A page that omits the suffix does not contradict one.
 * A surname that only occurs inside the company name does not count.
 */
export function personHit(text: string, name: string, org = ""): PersonHit {
  const parsed = parsePersonName(name);
  if (!parsed || parsed.given.length < 1) return "none";
  const companyRanges = org ? companySpanRanges(text, org) : [];
  const spans = orderedNameSpans(text, parsed).filter(
    (span) => !companyRanges.some((range) => span.surnameStart >= range.start && span.surnameStart < range.end),
  );
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
  const move = /\b(?:jumps|jumped|jump|joins|joined|joining)\s+(?:to\s+)?([\s\S]{0,90}?)\s+from\s+([\s\S]{0,120})/i.exec(text);
  if (move) {
    const destination = move[1];
    const origin = move[2].split(/[.]/)[0];
    if (mentionsCompany(destination, org)) return false;
    if (mentionsCompany(origin, org)) return true;
  }
  return /\b(?:leaves|left|leaving|departs|departed|departing|retiring|retires|retired)\b|\b(?:steps|stepped|stepping) down\b|\bto (?:retire|step down)\b|\btaking a step back\b/i.test(text);
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
    if (!distinctive.length) return false;
    if (!companyTokenHit(text, phrase[0])) return false;
    if (surnameOnly(text, phrase[0])) return false;
    void person;
    return true;
  }
  const firstDistinctive = distinctive[0] || phrase[0];
  for (let length = phrase.length; length >= 2; length -= 1) {
    const prefix = phrase.slice(0, length);
    if (!prefix.includes(firstDistinctive)) continue;
    if (consecutivePhrase(text, prefix)) return true;
  }
  void person;
  return false;
}
