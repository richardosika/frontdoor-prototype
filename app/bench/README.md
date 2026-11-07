# Verification benchmark harness

Repeatable before/after benchmark for Private Floor Club applicant verification
(`src/lib/verify/checks.ts` `collectChecks` -> `grade.ts` `gradeChecks`, plus legacy `score.ts` `scoreReport`).
No database needed. Network is ON. Free sources only: no API keys are passed, nothing paid is called, and email
domain is never used as evidence (every case uses a Gmail address, except the deliberate mailinator control F02).
Nothing is committed, pushed, or sent.

## Run

```bash
cd app
npx tsx bench/run-benchmark.ts --label before                 # writes bench/results-before.{json,md}
npx tsx bench/run-benchmark.ts --label after --compare bench/results-before.json   # adds a before/after diff + per-check flips
npx tsx bench/run-benchmark.ts --only F01,R02 --label scratch  # subset
npx tsx bench/run-benchmark.ts --render-only bench/results-before.json            # re-render the .md from a saved .json
```

Flags: `--label`, `--out <path-without-ext>`, `--only <ids>`, `--compare <prev.json>`, `--refresh-ofac`, `--render-only <json>`.
A full run is ~15-20 minutes because the app's `politeFetch` spaces requests per host (1 s) and each case makes ~30 calls.
Cases run sequentially on purpose so rate limits behave like production.

## Files

- `cases.json` - applicant inputs (name, email, org, website, LinkedIn URL, phone, role, statement, invite note) and expectations.
- `run-benchmark.ts` - the harness. Starts a loopback HTTP fixture server for the self-hosted-page fakes (F04, F04b, F08b),
  downloads OFAC `sdn.csv`/`alt.csv` into `bench/.cache/` (24 h cache, not part of the tarball) and parses them with the
  app's own `parseWatchlists`, runs a source-health preflight, then runs every case.
- `results-<label>.json` / `.md` - full per-check output and the human table.

## Expectations

- REAL: pass = not grade F and not DECLINE. A "false negative" is stricter: grade D/F or DECLINE.
  `companyOnly` cases (Prologis, Veris, Toll Brothers, Greystar) only expect the company to be corroborated.
  **Ground truth is to be confirmed by Richard.** Person-to-company pairings are the author's public-knowledge
  assumptions; the harness never asserts a current job title.
- FAKE: pass = grade F/D and NEEDS MORE INFO/DECLINE. A "false positive" = APPROVE* or grade A/B/C.
- F06a/F06b use a real individual pulled from the downloaded `sdn.csv` (ent# printed in the notes) and additionally require
  the sanctions check to FAIL (hard flag for 6a). F06c runs with an EMPTY watchlist and requires sanctions = NOT_RUN;
  it FAILS while the "sanctions passes with no list" bug exists (the `TEST_WATCHLIST` overlay makes `lists.length > 0`).

## Coverage

`Cov all` = weight of checks that returned PASS or FAIL / weight of all emitted checks. `net` = the same for non-local
(network) checks only. INCONCLUSIVE ("source answered, nothing found") does not count as covered.

## Known flakiness / environment limits

See "Source health" and the run-to-run flips section in the .md. Live data (news, YouTube, CourtListener, DDG/Bing)
changes between runs, and this box has no MX DNS records, no GDELT access, and DDG sometimes answers HTTP 202 (challenge).
