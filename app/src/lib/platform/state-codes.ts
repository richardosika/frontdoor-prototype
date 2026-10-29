/** Postal codes and full names. Matching is token-based so a city cannot satisfy a different state. */

export const STATE_NAMES: { code: string; name: string }[] = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];

const CODES = STATE_NAMES.map((item) => item.code);

export function isStateCode(value: string): boolean {
  return CODES.includes(value.trim().toUpperCase());
}

export function stateName(code: string): string {
  return STATE_NAMES.find((item) => item.code === code.toUpperCase())?.name ?? code.toUpperCase();
}

function hasCode(text: string, code: string): boolean {
  return new RegExp(`(?:^|[^A-Z])${code}(?:[^A-Z]|$)`).test(text.toUpperCase());
}

function phrase(text: string, name: string): boolean {
  const body = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "[^A-Za-z]+");
  return new RegExp(`(?:^|[^A-Za-z])${body}(?:[^A-Za-z]|$)`, "i").test(text);
}

/**
 * State codes present in free text.
 * "IN" does not match Austin. "CA" does not match Chicago. "Indianapolis" is not Indiana.
 * "Kansas City, MO" is Missouri. "Washington, DC" is the District, not Washington state.
 */
export function stateCodesInText(value: string): Set<string> {
  const found = new Set<string>();
  const raw = value || "";
  if (/\bD\.?\s*C\.?\b/i.test(raw)) found.add("DC");
  for (const code of CODES) {
    if (hasCode(raw, code)) found.add(code);
  }
  let working = raw;
  if (/\bWashington\b/i.test(working) && (found.has("DC") || /\bWashington\s*,?\s*(D\.?\s*C\.?|District of Columbia)\b/i.test(working))) {
    working = working.replace(/\bWashington\b/gi, " ");
  }
  if (/\bKansas City\b/i.test(working) && !found.has("KS")) {
    working = working.replace(/\bKansas City\b/gi, " ");
  }
  const names = [...STATE_NAMES].sort((a, b) => b.name.length - a.name.length);
  for (const item of names) {
    if (!phrase(working, item.name)) continue;
    found.add(item.code);
    working = working.replace(new RegExp(item.name.replace(/ /g, "[^A-Za-z]+"), "ig"), " ");
  }
  return found;
}

export function textHasStateCode(location: string, markets: string, code: string): boolean {
  const wanted = code.trim().toUpperCase();
  if (!isStateCode(wanted)) return false;
  return stateCodesInText(`${location}\n${markets}`).has(wanted);
}

type TextOp = "equals" | "startsWith" | "endsWith" | "contains";

export type LegacyStatePattern = { field: "location" | "markets"; op: TextOp; value: string };

function applyOp(text: string, op: TextOp, value: string): boolean {
  const hay = text.toLowerCase();
  const needle = value.toLowerCase();
  if (op === "equals") return hay === needle;
  if (op === "startsWith") return hay.startsWith(needle);
  if (op === "endsWith") return hay.endsWith(needle);
  return hay.includes(needle);
}

/** Delimited patterns for a database filter. None of them is a bare two-letter contains. */
export function legacyStatePatterns(code: string): LegacyStatePattern[] {
  const c = code.trim().toUpperCase();
  const patterns: LegacyStatePattern[] = [
    { field: "location", op: "equals", value: c },
    { field: "location", op: "endsWith", value: ` ${c}` },
    { field: "location", op: "endsWith", value: `,${c}` },
    { field: "location", op: "contains", value: `, ${c},` },
    { field: "location", op: "contains", value: `, ${c} ` },
    { field: "location", op: "contains", value: ` ${c},` },
    { field: "location", op: "contains", value: ` ${c} ` },
    { field: "markets", op: "equals", value: c },
    { field: "markets", op: "startsWith", value: `${c},` },
    { field: "markets", op: "startsWith", value: `${c}, ` },
    { field: "markets", op: "endsWith", value: `, ${c}` },
    { field: "markets", op: "endsWith", value: `,${c}` },
    { field: "markets", op: "contains", value: `, ${c},` },
    { field: "markets", op: "contains", value: `,${c},` },
    { field: "markets", op: "contains", value: `, ${c} ` },
    { field: "markets", op: "contains", value: ` ${c},` },
    { field: "markets", op: "contains", value: ` ${c} ` },
  ];
  const name = STATE_NAMES.find((item) => item.code === c)?.name;
  if (name && c !== "WA") {
    patterns.push(
      { field: "location", op: "equals", value: name },
      { field: "location", op: "endsWith", value: ` ${name}` },
      { field: "location", op: "endsWith", value: `, ${name}` },
      { field: "location", op: "contains", value: `, ${name},` },
      { field: "location", op: "contains", value: `, ${name} ` },
      { field: "location", op: "contains", value: ` ${name},` },
      { field: "location", op: "contains", value: ` ${name} ` },
      { field: "markets", op: "equals", value: name },
      { field: "markets", op: "contains", value: `, ${name},` },
      { field: "markets", op: "contains", value: `, ${name}` },
    );
  }
  if (c === "WA") {
    patterns.push(
      { field: "location", op: "equals", value: "Washington" },
      { field: "location", op: "endsWith", value: ", WA" },
      { field: "location", op: "contains", value: ", WA " },
      { field: "location", op: "contains", value: ", Washington," },
      { field: "location", op: "endsWith", value: ", Washington" },
    );
  }
  if (c === "DC") {
    patterns.push(
      { field: "location", op: "contains", value: "Washington, DC" },
      { field: "location", op: "contains", value: "Washington, D.C" },
      { field: "location", op: "contains", value: "District of Columbia" },
      { field: "markets", op: "equals", value: "DC" },
    );
  }
  if (c === "MO") {
    patterns.push({ field: "location", op: "contains", value: "Kansas City" });
  }
  return patterns;
}

export function legacyPatternsMatch(location: string, markets: string, code: string): boolean {
  return legacyStatePatterns(code).some((pattern) => applyOp(pattern.field === "location" ? location : markets, pattern.op, pattern.value));
}

export function bareStateContains(patterns: LegacyStatePattern[], code: string): boolean {
  const c = code.toUpperCase();
  return patterns.some((pattern) => pattern.op === "contains" && pattern.value.toUpperCase() === c);
}
