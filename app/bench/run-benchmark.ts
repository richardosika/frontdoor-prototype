/**
 * Private Floor Club verification benchmark harness.
 *
 *   cd app && npx tsx bench/run-benchmark.ts --label before
 *   npx tsx bench/run-benchmark.ts --label after --compare bench/results-before.json
 *   npx tsx bench/run-benchmark.ts --only F01,R02 --label scratch
 *
 * For each case in bench/cases.json it builds the applicant facts the same way engine.ts does, then runs the
 * real pipeline with network ON: collectChecks -> gradeChecks (rubric) and scoreReport (legacy score/verdict).
 * No database is touched. FREE SOURCES ONLY: the pipeline's own free fetches (CourtListener, SEC, OFAC, RDAP,
 * web/news scrapes); no API keys are supplied, nothing paid is called, and email domain is never used as evidence.
 * Nothing is committed, pushed, or sent. Network results are inherently a little flaky: see "Source health".
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { collectChecks, type CheckContext, type WatchlistEntry } from "@/lib/verify/checks";
import { clearFetchCache, politeFetch } from "@/lib/verify/fetch";
import { gradeChecks, RUBRIC_VERSION } from "@/lib/verify/grade";
import { scoreReport } from "@/lib/verify/score";
import type { ApplicantFacts, CheckOutput } from "@/lib/verify/types";
import { parseWatchlists, splitCsv } from "@/lib/verify/watchlist";

type Case = {
  id: string;
  kind: "real" | "fake" | "qa";
  label: string;
  companyOnly?: boolean;
  qaExpect?: "firm" | "fake";
  personAssumption?: string;
  name: string;
  email: string;
  org: string;
  website?: string;
  linkedinUrl?: string;
  location?: string;
  role?: string;
  phone?: string;
  statement?: string;
  inviteNote?: string;
  socialLinks?: string;
  watchlist?: "full" | "empty";
  sdnPick?: string;
  mustSanctions?: string;
  mustHardFlag?: boolean;
  fixture?: { title: string; body: string };
};

const BENCH_DIR = __dirname;
const CACHE_DIR = path.join(BENCH_DIR, ".cache");
const USER_AGENT = "PrivateFloorClub/1.0 (verification; connect@privatefloorclub.com)";
const CASE_TIMEOUT_MS = 5 * 60 * 1000;

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] ?? "" : undefined;
};
const label = flag("label") || "run";
const outBase = flag("out") || path.join(BENCH_DIR, `results-${label}`);
const only = (flag("only") || "").split(",").map((s) => s.trim()).filter(Boolean);
const comparePath = flag("compare");
const refreshOfac = args.includes("--refresh-ofac");

const LOCAL_KEYS = new Set([
  "email-syntax", "email-provider", "disposable-email", "role-address", "phone-state", "text-risk", "duplicate", "sanctions",
  "linkedin-format", "business-card", "invite-source", "plausibility", "velocity", "social-links", "business-registry",
]);
const COMPANY_EVIDENCE = (key: string) => ["website", "edgar", "web-footprint", "news", "linkedin-fetch"].includes(key) || key.startsWith("screen-");
const CODE: Record<string, string> = { PASS: "P", FAIL: "F", INCONCLUSIVE: "I", UNAVAILABLE: "U", NOT_RUN: "N" };

async function download(url: string, dest: string): Promise<{ ok: boolean; status: number; bytes: number }> {
  try {
    const res = await fetch(url, { headers: { "user-agent": USER_AGENT }, redirect: "follow", signal: AbortSignal.timeout(90_000) });
    if (!res.ok) return { ok: false, status: res.status, bytes: 0 };
    const text = await res.text();
    fs.writeFileSync(dest, text);
    return { ok: true, status: res.status, bytes: text.length };
  } catch {
    return { ok: false, status: 0, bytes: 0 };
  }
}

async function loadOfac(): Promise<{ entries: WatchlistEntry[]; sdnCsv: string; note: string }> {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const sdnPath = path.join(CACHE_DIR, "sdn.csv");
  const altPath = path.join(CACHE_DIR, "alt.csv");
  const fresh = (p: string) => fs.existsSync(p) && Date.now() - fs.statSync(p).mtimeMs < 24 * 3600 * 1000;
  const notes: string[] = [];
  if (refreshOfac || !fresh(sdnPath)) {
    const r = await download("https://www.treasury.gov/ofac/downloads/sdn.csv", sdnPath);
    notes.push(`sdn.csv download HTTP ${r.status} (${r.bytes} chars)`);
  } else notes.push("sdn.csv from <24h cache");
  if (refreshOfac || !fresh(altPath)) {
    const r = await download("https://www.treasury.gov/ofac/downloads/alt.csv", altPath);
    notes.push(`alt.csv download HTTP ${r.status} (${r.bytes} chars)`);
  } else notes.push("alt.csv from <24h cache");
  const sdnCsv = fs.existsSync(sdnPath) ? fs.readFileSync(sdnPath, "utf8") : "";
  const altCsv = fs.existsSync(altPath) ? fs.readFileSync(altPath, "utf8") : "";
  const entries = sdnCsv.length > 1000 ? parseWatchlists(sdnCsv, altCsv) : [];
  notes.push(`${entries.length} watchlist entries parsed (same parser as the app's refreshWatchlist)`);
  return { entries, sdnCsv, note: notes.join("; ") };
}

/** "LOGUNOV, Oleg" -> { ent, name: "Oleg Logunov" } using the real downloaded sdn.csv. */
function pickSdn(sdnCsv: string, listed: string): { ent: string; name: string; remarks: string } | null {
  for (const row of sdnCsv.split(/\r?\n/)) {
    if (!row.trim()) continue;
    const c = splitCsv(row);
    if ((c[1] || "").trim() === listed && (c[2] || "").trim() === "individual") {
      const [sur, given] = listed.split(",").map((s) => s.trim());
      const title = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();
      return { ent: (c[0] || "").trim(), name: `${given} ${title(sur)}`, remarks: (c[11] || "").trim() };
    }
  }
  return null;
}

function startFixtureServer(): Promise<{ base: string; pages: Map<string, string>; close: () => void }> {
  const pages = new Map<string, string>();
  const server = http.createServer((req, res) => {
    const html = pages.get((req.url || "/").split("?")[0]);
    if (!html) {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("not found");
      return;
    }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(html);
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const port = (server.address() as { port: number }).port;
      resolve({ base: `http://127.0.0.1:${port}`, pages, close: () => server.close() });
    });
  });
}

async function preflight(): Promise<{ name: string; url: string; status: number; ms: number }[]> {
  const probes = [
    ["CourtListener v4", "https://www.courtlistener.com/api/rest/v4/search/?q=%22Jane+Roe%22&type=o"],
    ["SEC company_tickers", "https://www.sec.gov/files/company_tickers.json"],
    ["SEC efts (URL as used by edgar.ts)", "https://efts.sec.gov/LATEST/search-index?q=%22Hines%22+%22Prologis%22&dateRange=custom&startdt=2015-01-01&enddt=2030-01-01"],
    ["DuckDuckGo html", "https://html.duckduckgo.com/html/?q=%22Jonathan+Gray%22+Blackstone"],
    ["Bing web", "https://www.bing.com/search?q=%22Jonathan+Gray%22+Blackstone"],
    ["Google News RSS", "https://news.google.com/rss/search?q=Blackstone"],
    ["GDELT doc API", "https://api.gdeltproject.org/api/v2/doc/doc?query=%22Blackstone%22&mode=artlist&format=json&maxrecords=3"],
    ["OFAC sdn.csv (HEAD)", "https://www.treasury.gov/ofac/downloads/sdn.csv"],
    ["rdap.org", "https://rdap.org/domain/prologis.com"],
    ["OpenSanctions API (expected 401)", "https://api.opensanctions.org/search/default?q=test"],
    ["OpenCorporates API (expected 401)", "https://api.opencorporates.com/v0.4/companies/search?q=prologis"],
  ];
  const out: { name: string; url: string; status: number; ms: number }[] = [];
  for (const [name, url] of probes) {
    const t0 = Date.now();
    let status = 0;
    try {
      const res = await fetch(url, { method: name.includes("HEAD") ? "HEAD" : "GET", headers: { "user-agent": USER_AGENT }, signal: AbortSignal.timeout(30_000) });
      status = res.status;
      await res.body?.cancel().catch(() => undefined);
    } catch {
      status = 0;
    }
    out.push({ name, url, status, ms: Date.now() - t0 });
  }
  const t0 = Date.now();
  let mx = "ok";
  try {
    const dns = await import("node:dns/promises");
    const r = await dns.resolveMx("gmail.com");
    mx = r.length ? "ok" : "empty";
  } catch (e) {
    mx = `error ${(e as { code?: string }).code ?? "unknown"}`;
  }
  out.push({ name: `DNS MX gmail.com (${mx})`, url: "dns", status: mx === "ok" ? 200 : 0, ms: Date.now() - t0 });
  return out;
}

function buildFacts(c: Case, defaults: Record<string, string>, name: string, website: string): ApplicantFacts {
  const d = (k: string) => (c as unknown as Record<string, string | undefined>)[k] ?? defaults[k] ?? "";
  return {
    name,
    applicantName: name,
    email: c.email,
    org: c.org,
    location: d("location"),
    role: d("role"),
    phone: d("phone"),
    website,
    linkedinUrl: d("linkedinUrl"),
    socialLinks: d("socialLinks"),
    statement: d("statement"),
    inviteNote: d("inviteNote"),
    testProfile: "",
    cardText: "",
    cardUploaded: false,
    duplicateOfMember: false,
    duplicateOfDeclined: false,
    recentApplications: 0,
    referenceCount: 0,
  };
}

function coverage(checks: CheckOutput[], filter?: (c: CheckOutput) => boolean) {
  const set = filter ? checks.filter(filter) : checks;
  const total = set.reduce((s, c) => s + Math.max(0, c.weight), 0);
  const covered = set.filter((c) => c.status === "PASS" || c.status === "FAIL").reduce((s, c) => s + Math.max(0, c.weight), 0);
  return { covered, total, share: total ? Math.round((1000 * covered) / total) / 10 : 0 };
}

const short = (s: string, n = 150) => (s.length > n ? `${s.slice(0, n - 1)}…` : s).replace(/\s+/g, " ").replace(/\|/g, "/");

function evaluate(c: Case, grade: { letter: string; recommendation: string }, checks: CheckOutput[]) {
  const sanctions = checks.find((x) => x.key === "sanctions");
  const reasons: string[] = [];
  let ok: boolean;
  let falsePositive = false;
  let falseNegative = false;
  let expected: string;
  if (c.kind === "real") {
    expected = c.companyOnly ? "not F/DECLINE; company-only corroboration" : "not F/DECLINE; company corroborated where public";
    ok = grade.letter !== "F" && grade.recommendation !== "DECLINE";
    falseNegative = ["D", "F"].includes(grade.letter) || grade.recommendation === "DECLINE";
    const corroborated = checks.filter((x) => x.status === "PASS" && x.corroborates && COMPANY_EVIDENCE(x.key));
    if (!corroborated.length) reasons.push("MISS: no company-evidence check returned PASS with corroborates=true.");
    if (falseNegative) reasons.push(`False negative: grade ${grade.letter} / ${grade.recommendation}.`);
    if (falseNegative || !corroborated.length) {
      for (const x of checks) {
        if (COMPANY_EVIDENCE(x.key) && x.status !== "PASS") reasons.push(`${x.key}=${x.status}: ${short(x.finding)}`);
        if (x.hardFlag || x.reviewFlag) reasons.push(`FLAG ${x.key}=${x.status}${x.hardFlag ? " hard" : " review"}: ${short(x.finding)}`);
      }
    }
  } else if (c.kind === "fake") {
    expected = "F/D and NEEDS MORE INFO/DECLINE, never APPROVE*";
    ok = ["F", "D"].includes(grade.letter) && ["NEEDS MORE INFO", "DECLINE"].includes(grade.recommendation);
    falsePositive = grade.recommendation.startsWith("APPROVE") || ["A", "B", "C"].includes(grade.letter);
    if (!ok) reasons.push(`Expectation missed: grade ${grade.letter} / ${grade.recommendation}.`);
    const corr = checks.filter((x) => x.status === "PASS" && x.corroborates);
    if (!ok || corr.length) for (const x of corr) reasons.push(`Corroborating PASS on a fake: ${x.key}: ${short(x.finding)}`);
  } else {
    expected = c.qaExpect === "fake"
      ? "QA fake control: F or D, never APPROVE*, domain does not resolve"
      : "QA firm, person unmatched: company-only credit allowed, never APPROVE*";
    ok = ["F", "D"].includes(grade.letter) && !grade.recommendation.startsWith("APPROVE");
    falsePositive = grade.recommendation.startsWith("APPROVE") || ["A", "B", "C"].includes(grade.letter);
    if (!ok) reasons.push(`QA expectation missed: grade ${grade.letter} / ${grade.recommendation}.`);
    if (c.qaExpect === "fake" && !checks.some((x) => x.status === "FAIL" && /domain does not resolve/i.test(x.finding))) {
      ok = false;
      reasons.push("Fake control did not FAIL with domain does not resolve.");
    }
  }
  if (c.mustSanctions) {
    const got = sanctions?.status ?? "missing";
    if (got !== c.mustSanctions) {
      ok = false;
      reasons.push(`Sanctions expected ${c.mustSanctions}, got ${got}${got === "PASS" && c.watchlist === "empty" ? " - BUG: sanctions PASSES with no list loaded (TEST_WATCHLIST overlay makes lists.length > 0)." : "."}`);
    }
    if (c.mustHardFlag && !sanctions?.hardFlag) {
      ok = false;
      reasons.push("Sanctions hit was not a hard flag despite a corroborating location.");
    }
  }
  if (c.kind === "fake" && c.id !== "F06c" && sanctions && c.watchlist !== "empty" && sanctions.status === "PASS" && c.sdnPick) {
    ok = false;
    reasons.push("Real SDN individual was NOT matched.");
  }
  return { ok, falsePositive, falseNegative, expected, reasons };
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout;
  const t = new Promise<never>((_, rej) => {
    timer = setTimeout(() => rej(new Error(`case timed out after ${ms / 1000}s`)), ms);
  });
  try {
    return await Promise.race([p, t]);
  } finally {
    clearTimeout(timer!);
  }
}

async function main() {
  const renderOnly = flag("render-only");
  if (renderOnly) {
    const payload = JSON.parse(fs.readFileSync(renderOnly, "utf8"));
    fs.writeFileSync(renderOnly.replace(/\.json$/, ".md"), renderMarkdown(payload, comparePath));
    console.log(`[bench] re-rendered ${renderOnly.replace(/\.json$/, ".md")}`);
    return;
  }
  const spec = JSON.parse(fs.readFileSync(path.join(BENCH_DIR, "cases.json"), "utf8")) as {
    _meta: { defaults: Record<string, string>; groundTruthNote: string };
    cases: Case[];
  };
  const startedAt = new Date();
  console.log(`[bench] label=${label} rubric=${RUBRIC_VERSION} started ${startedAt.toString()}`);
  const health = await preflight();
  for (const h of health) console.log(`[preflight] ${h.name}: HTTP ${h.status} (${h.ms}ms)`);
  const ofac = await loadOfac();
  console.log(`[ofac] ${ofac.note}`);
  const fixture = await startFixtureServer();
  const results: Record<string, unknown>[] = [];
  const selected = spec.cases.filter((c) => !only.length || only.includes(c.id));
  for (const c of selected) {
    const t0 = Date.now();
    let name = c.name;
    const notes: string[] = [];
    if (c.sdnPick) {
      const pick = pickSdn(ofac.sdnCsv, c.sdnPick);
      if (pick) {
        name = pick.name;
        notes.push(`SDN individual ent#${pick.ent} "${c.sdnPick}" pulled from downloaded sdn.csv (remarks: ${short(pick.remarks, 90)})`);
      } else notes.push(`WARNING: SDN entry ${c.sdnPick} not found in the downloaded sdn.csv`);
    }
    let website = c.website ?? spec._meta.defaults.website ?? "";
    if (website === "{{fixture}}") {
      if (!c.fixture) throw new Error(`${c.id} wants a fixture page but defines none`);
      fixture.pages.set(`/${c.id}/`, `<!doctype html><html><head><title>${c.fixture.title}</title></head><body><h1>${c.fixture.title}</h1><p>${c.fixture.body}</p></body></html>`);
      website = `${fixture.base}/${c.id}/`;
      notes.push(`Self-hosted fixture page at ${website}`);
    }
    const facts = buildFacts(c, spec._meta.defaults, name, website);
    const watchlist = c.watchlist === "empty" ? [] : ofac.entries;
    clearFetchCache();
    console.log(`[case] ${c.id} ${c.label}`);
    let record: Record<string, unknown>;
    try {
      const ctx: CheckContext = { facts, watchlist, network: true, fetchText: politeFetch };
      const report = scoreReport(await withTimeout(collectChecks(ctx), CASE_TIMEOUT_MS));
      const grade = gradeChecks(report.checks, facts, { gradedAt: new Date().toISOString(), subject: "APPLICATION" });
      const ev = evaluate({ ...c, watchlist: c.watchlist }, grade, report.checks);
      const keyCount = new Map<string, number>();
      const checks = report.checks.map((x) => {
        const n = (keyCount.get(x.key) ?? 0) + 1;
        keyCount.set(x.key, n);
        return {
          key: n > 1 ? `${x.key}#${n}` : x.key,
          status: x.status,
          weight: x.weight,
          hardFlag: Boolean(x.hardFlag),
          reviewFlag: Boolean(x.reviewFlag),
          corroborates: Boolean(x.corroborates),
          companyOnly: Boolean(x.companyOnly),
          finding: x.finding,
          source: x.source,
          url: x.url,
        };
      });
      record = {
        id: c.id,
        kind: c.kind,
        label: c.label,
        companyOnly: Boolean(c.companyOnly),
        qaExpect: c.qaExpect || "",
        personAssumption: c.personAssumption ?? "",
        watchlist: c.watchlist ?? "full",
        watchlistEntries: watchlist.length,
        notes,
        facts,
        expected: ev.expected,
        checks,
        grade: {
          letter: grade.letter,
          score: grade.score,
          rawScore: grade.rawScore,
          confidence: grade.confidence,
          recommendation: grade.recommendation,
          caps: grade.caps,
          banner: grade.banner,
          attention: grade.attention.map((a) => `${a.severity}: ${a.title}`),
          categories: grade.categories.map((k) => `${k.label}: ${k.earned}/${k.possible}`),
        },
        legacy: { score: report.score, verdict: report.verdict },
        coverage: { all: coverage(report.checks), network: coverage(report.checks, (x) => !LOCAL_KEYS.has(x.key)) },
        result: ev.ok ? "PASS" : "FAIL",
        falsePositive: ev.falsePositive,
        falseNegative: ev.falseNegative,
        reasons: ev.reasons,
        elapsedMs: Date.now() - t0,
      };
    } catch (error) {
      record = {
        id: c.id, kind: c.kind, label: c.label, notes, facts, expected: c.kind === "real" ? "not F/DECLINE" : "F/D, never APPROVE*",
        checks: [], grade: null, legacy: null, coverage: null, result: "ERROR", falsePositive: false, falseNegative: false,
        reasons: [`Harness error: ${error instanceof Error ? error.message : String(error)}`], elapsedMs: Date.now() - t0,
      };
    }
    results.push(record);
    const g = record.grade as { letter: string; score: number; recommendation: string } | null;
    console.log(`       -> ${record.result} ${g ? `${g.letter} ${g.score} ${g.recommendation}` : ""} (${Math.round((record.elapsedMs as number) / 1000)}s)`);
  }
  fixture.close();
  const finishedAt = new Date();
  const payload = {
    label,
    rubricVersion: RUBRIC_VERSION,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    startedAtLocal: startedAt.toLocaleString("en-US", { timeZone: "America/New_York" }) + " (America/New_York)",
    groundTruthNote: spec._meta.groundTruthNote,
    ofac: ofac.note,
    sourceHealth: health,
    summary: summarize(results),
    results,
  };
  fs.writeFileSync(`${outBase}.json`, JSON.stringify(payload, null, 2));
  fs.writeFileSync(`${outBase}.md`, renderMarkdown(payload, comparePath));
  console.log(`[bench] wrote ${outBase}.json and ${outBase}.md`);
  console.log(JSON.stringify(payload.summary));
}

function summarize(results: Record<string, unknown>[]) {
  const real = results.filter((r) => r.kind === "real");
  const fake = results.filter((r) => r.kind === "fake");
  const ids = (xs: Record<string, unknown>[], f: (r: Record<string, unknown>) => boolean) => xs.filter(f).map((r) => r.id);
  return {
    cases: results.length,
    passed: results.filter((r) => r.result === "PASS").length,
    failed: results.filter((r) => r.result === "FAIL").length,
    errored: results.filter((r) => r.result === "ERROR").length,
    falsePositives: { count: ids(results, (r) => Boolean(r.falsePositive)).length, ids: ids(results, (r) => Boolean(r.falsePositive)), definition: "fake or QA control reaching APPROVE* or grade >= C" },
    falseNegatives: { count: ids(real, (r) => Boolean(r.falseNegative)).length, ids: ids(real, (r) => Boolean(r.falseNegative)), definition: "real entity graded D/F or DECLINE" },
    realHardFail: ids(real, (r) => r.result !== "PASS"),
  };
}

function renderMarkdown(p: ReturnType<typeof Object>, compare?: string): string {
  const payload = p as unknown as {
    label: string; rubricVersion: string; startedAtLocal: string; groundTruthNote: string; ofac: string;
    sourceHealth: { name: string; status: number; ms: number }[]; summary: ReturnType<typeof summarize>;
    results: Record<string, any>[];
  };
  const L: string[] = [];
  L.push(`# Verification benchmark - ${payload.label}`, "");
  L.push(`Rubric ${payload.rubricVersion}. Run started ${payload.startedAtLocal}. Network ON, free sources only.`, "");
  L.push(`> ${payload.groundTruthNote}`, "");
  L.push(`OFAC: ${payload.ofac}`, "");
  L.push("## Results", "");
  L.push("| Case | Kind | Case label | Expected | Grade | Score | Conf | Recommendation | Legacy | Cov all / net | Result |");
  L.push("|---|---|---|---|---|---|---|---|---|---|---|");
  for (const r of payload.results) {
    const g = r.grade;
    L.push(
      `| ${r.id} | ${r.kind}${r.companyOnly ? " (company only)" : ""} | ${short(r.label, 70)} | ${r.expected} | ${g ? g.letter : "-"} | ${g ? g.score : "-"} | ${g ? g.confidence : "-"} | ${g ? g.recommendation : "-"} | ${r.legacy ? `${r.legacy.score} ${r.legacy.verdict}` : "-"} | ${r.coverage ? `${r.coverage.all.share}% / ${r.coverage.network.share}%` : "-"} | **${r.result}**${r.falsePositive ? " FP" : ""}${r.falseNegative ? " FN" : ""} |`,
    );
  }
  const s = payload.summary;
  L.push("", "## Counts", "");
  L.push(`- Cases: ${s.cases}; PASS ${s.passed}, FAIL ${s.failed}, ERROR ${s.errored}.`);
  L.push(`- False positives (${s.falsePositives.definition}): **${s.falsePositives.count}** ${s.falsePositives.ids.length ? `(${s.falsePositives.ids.join(", ")})` : ""}`);
  L.push(`- False negatives (${s.falseNegatives.definition}): **${s.falseNegatives.count}** ${s.falseNegatives.ids.length ? `(${s.falseNegatives.ids.join(", ")})` : ""}`);
  L.push("", "## Per-check status matrix", "", "P=PASS F=FAIL I=INCONCLUSIVE U=UNAVAILABLE N=NOT_RUN, blank = check not emitted. Weights in the key column are the PASS-time weights seen first.", "");
  const keys: string[] = [];
  const weightOf = new Map<string, number>();
  for (const r of payload.results) for (const c of r.checks as { key: string; weight: number }[]) if (!c.key.startsWith("news-story") && !keys.includes(c.key)) { keys.push(c.key); weightOf.set(c.key, c.weight); }
  L.push(`| Check (weight) | ${payload.results.map((r) => r.id).join(" | ")} |`);
  L.push(`|---|${payload.results.map(() => ":-:").join("|")}|`);
  for (const k of keys) {
    const cells = payload.results.map((r) => {
      const c = (r.checks as { key: string; status: string; hardFlag: boolean; corroborates: boolean }[]).find((x) => x.key === k);
      return c ? `${CODE[c.status] ?? "?"}${c.hardFlag ? "!" : ""}${c.corroborates ? "*" : ""}` : "";
    });
    L.push(`| ${k} (${weightOf.get(k)}) | ${cells.join(" | ")} |`);
  }
  L.push("", "`*` = corroborates=true, `!` = hard flag.", "");
  L.push("## Reasons and notes", "");
  for (const r of payload.results) {
    const lines = [...(r.notes as string[]), ...(r.reasons as string[])];
    if (r.personAssumption) lines.unshift(`Ground truth to be confirmed by Richard: ${r.personAssumption}`);
    if (r.grade?.caps?.length) lines.push(`Caps applied: ${(r.grade.caps as string[]).join("; ")}`);
    if (!lines.length) continue;
    L.push(`### ${r.id} - ${r.label}`);
    for (const line of lines) L.push(`- ${line}`);
    L.push("");
  }
  L.push("## Source health (preflight)", "", "| Source | HTTP | ms |", "|---|---|---|");
  for (const h of payload.sourceHealth) L.push(`| ${h.name} | ${h.status} | ${h.ms} |`);
  const unavailable = new Map<string, number>();
  for (const r of payload.results) for (const c of r.checks as { key: string; status: string }[]) if (c.status === "UNAVAILABLE") unavailable.set(c.key.replace(/#\d+$/, ""), (unavailable.get(c.key.replace(/#\d+$/, "")) ?? 0) + 1);
  L.push("", `UNAVAILABLE counts per check across ${payload.results.length} cases: ${[...unavailable].map(([k, n]) => `${k}=${n}`).join(", ") || "none"}.`, "");
  if (compare && fs.existsSync(compare)) {
    const prev = JSON.parse(fs.readFileSync(compare, "utf8")) as { label: string; results: Record<string, any>[] };
    L.push(`## Change vs ${prev.label}`, "", "| Case | Before | After | Result before -> after |", "|---|---|---|---|");
    for (const r of payload.results) {
      const b = prev.results.find((x) => x.id === r.id);
      const fmt = (x?: Record<string, any>) => (x?.grade ? `${x.grade.letter} ${x.grade.score} ${x.grade.recommendation}` : "-");
      L.push(`| ${r.id} | ${fmt(b)} | ${fmt(r)} | ${b?.result ?? "-"} -> ${r.result} |`);
    }
    L.push("", `### Per-check status flips vs ${prev.label} (network flakiness or live-data drift)`, "");
    let flips = 0;
    for (const r of payload.results) {
      const b = prev.results.find((x) => x.id === r.id);
      if (!b) continue;
      const diffs: string[] = [];
      for (const c of r.checks as { key: string; status: string }[]) {
        if (c.key.startsWith("news-story")) continue;
        const o = (b.checks as { key: string; status: string }[]).find((x) => x.key === c.key);
        if (o && o.status !== c.status) diffs.push(`${c.key} ${o.status}->${c.status}`);
      }
      if (diffs.length) {
        flips += diffs.length;
        L.push(`- ${r.id}: ${diffs.join("; ")}`);
      }
    }
    if (!flips) L.push("- none");
    L.push("");
  }
  return L.join("\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
