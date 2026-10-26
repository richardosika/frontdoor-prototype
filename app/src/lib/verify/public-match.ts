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

export function wordHit(text: string, token: string): boolean {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(text);
}

/** "Captiva Island" and "Captiva Dr" are places, not Captiva Development. */
function companyTokenHit(text: string, token: string): boolean {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const stripped = text.replace(new RegExp(`\\b${escaped}\\s+(?:${PLACE_AFTER})\\b`, "gi"), " ");
  if (wordHit(stripped, token)) return true;
  if (token.length < 8) return false;
  for (let index = 4; index <= token.length - 3; index += 1) {
    const left = token.slice(0, index);
    const right = token.slice(index);
    if (new RegExp(`\\b${left}\\s+${right}\\b`, "i").test(stripped)) return true;
  }
  return false;
}

export function alternatePersonNames(name: string): string[] {
  const cleaned = name.replace(/\b[A-Za-z]\.\s*/g, " ").replace(/\s+/g, " ").trim();
  const parts = tokens(cleaned).filter((token) => token.length >= 3);
  if (parts.length < 2) return cleaned ? [cleaned] : [];
  const last = parts[parts.length - 1];
  const lastLabel = last.charAt(0).toUpperCase() + last.slice(1);
  const names = new Set<string>([cleaned]);
  for (const nick of NICKNAMES[parts[0]] || []) {
    if (nick === parts[0]) continue;
    names.add(`${nick.charAt(0).toUpperCase()}${nick.slice(1)} ${lastLabel}`);
  }
  return [...names];
}

/**
 * Words that distinguish this firm. A common word such as "related" is kept only together with the rest of the name.
 * A 4-letter token is kept when it is not generic ("toll" in "Toll Brothers") so a real short name can match.
 * A single short token still has to be the whole distinctive name; a longer different firm does not fit.
 */
export function distinctiveCompanyTokens(org: string): string[] {
  const kept = tokens(org).filter((token) => !LEGAL.has(token));
  const distinctive = kept.filter((token) => token.length >= 4 && !GENERIC.has(token) && !SHORT_GENERIC.has(token));
  return distinctive.length ? distinctive : kept.filter((token) => token.length >= 5);
}

export function mentionsPerson(text: string, name: string): boolean {
  const parts = tokens(name).filter((token) => token.length >= 3);
  if (parts.length < 2) return false;
  return parts.every((part) => (NICKNAMES[part] || [part]).some((alt) => wordHit(text, alt)));
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
  const all = text.match(new RegExp(`\\b${escaped}\\b`, "gi")) || [];
  if (!all.length) return false;
  let nameHits = 0;
  const pattern = new RegExp(`\\b([A-Za-z]+)["']?\\s+["']?${escaped}\\b`, "gi");
  for (const match of text.matchAll(pattern)) {
    if (looksLikeGivenName(match[1])) nameHits += 1;
  }
  return nameHits > 0 && nameHits >= all.length;
}

function looseToken(text: string, token: string): boolean {
  if (!wordHit(text, token)) return false;
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const uses = text.match(new RegExp(`\\b${escaped}\\b`, "gi")) || [];
  const english = text.match(new RegExp(`\\b${escaped}\\s+to\\b`, "gi")) || [];
  return uses.length > english.length;
}

export function mentionsCompany(text: string, org: string, person = ""): boolean {
  const named = distinctiveCompanyTokens(org);
  const genericOnly = !named.length || named.every((token) => GENERIC.has(token));
  if (!genericOnly) {
    if (!named.every((token) => companyTokenHit(text, token))) return false;
    if (named.length === 1 && surnameOnly(text, named[0])) return false;
    return true;
  }
  const companyTokens = tokens(org).filter((token) => !LEGAL.has(token) && token.length >= 5);
  if (!companyTokens.length) return false;
  if (companyTokens.every((token) => companyTokenHit(text, token))) return true;
  if (!person || !mentionsPerson(text, person)) return false;
  return companyTokens.some((token) => token.length >= 7 && looseToken(text, token));
}
