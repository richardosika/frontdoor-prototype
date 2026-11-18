# Verification benchmark - after-admin-pass

These six cases are the fifth follow-up checks. They do not replace the 36-case `after-qa` run. A PASS here means the phrase showed up, not that the file is an approval. All six are F and NEEDS MORE INFO.

- C01 states General Contractor, not Developer. The 800 line is not applicable, so identity is 8 of 15 rather than 0 of 3.
- C02 `ZZ` / `00000` fails the address check. Completeness is 4 of 10. C01, with a real state and no street, is 6 of 10.
- C03 `example.com` RDAP is FAIL, “did not check out”, and earns 0. A dead non-reserved domain is still “domain does not resolve” in the unit tests.
- C04 is a referral or request with no application. The summary says the grade uses the request fields only, and the role is still General Contractor.
- C05 `4600 Silver Hill Rd, Washington, DC 20233` matched the keyless Census geocoder.
- C06 Colorado open data lists LOCKHEED MARTIN CORPORATION. `corroborates` is false. NJ, WA, and IA stay not checkable for free.

Rubric 2026-10-25. Run started 10/26/2026, 3:35:10 PM (America/New_York). Network ON, free sources only.

> GROUND TRUTH TO BE CONFIRMED BY RICHARD. Person-to-company links and titles for REAL cases are the benchmark author's public-knowledge assumptions. They are NOT verified and the harness never asserts a current job title. Cases marked companyOnly only expect company corroboration.

OFAC: sdn.csv from <24h cache; alt.csv from <24h cache; 39614 watchlist entries parsed (same parser as the app's refreshWatchlist)

## Results

| Case | Kind | Case label | Expected | Grade | Score | Conf | Recommendation | Legacy | Cov all / net | Result |
|---|---|---|---|---|---|---|---|---|---|---|
| C01 | check | General contractor role and toll-free 800 line | admin-pass check | F | 34 | Low | NEEDS MORE INFO | 42 NEEDS_OWNER_DECISION | 31.1% / 9.1% | **PASS** |
| C02 | check | Invalid state ZZ and ZIP 00000 | admin-pass check | F | 32 | Low | NEEDS MORE INFO | 40 NEEDS_OWNER_DECISION | 31.1% / 9.1% | **PASS** |
| C03 | check | Reserved example.com domain | admin-pass check | F | 34 | Low | NEEDS MORE INFO | 36 NEEDS_OWNER_DECISION | 32.9% / 14.3% | **PASS** |
| C04 | check | Referral request with no application | admin-pass check | F | 37 | Low | NEEDS MORE INFO | 45 NEEDS_OWNER_DECISION | 33.8% / 9.1% | **PASS** |
| C05 | check | Census geocoder on a real street | admin-pass check | F | 32 | Low | NEEDS MORE INFO | 42 NEEDS_OWNER_DECISION | 31.1% / 9.1% | **PASS** |
| C06 | check | Colorado registry exact company name | admin-pass check | F | 40 | Low | NEEDS MORE INFO | 55 NEEDS_OWNER_DECISION | 44.4% / 27.3% | **PASS** |

## Counts

- Cases: 6; PASS 6, FAIL 0, ERROR 0.
- False positives (fake or QA control reaching APPROVE* or grade >= C): **0** 
- False negatives (real entity graded D/F or DECLINE): **0** 

## Per-check status matrix

P=PASS F=FAIL I=INCONCLUSIVE U=UNAVAILABLE N=NOT_RUN, blank = check not emitted. Weights in the key column are the PASS-time weights seen first.

| Check (weight) | C01 | C02 | C03 | C04 | C05 | C06 |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| email-syntax (5) | P | P | P | P | P | P |
| email-provider (2) | P | P | P | P | P | P |
| disposable-email (8) | P | P | P | P | P | P |
| role-address (4) | P | P | P | P | P | P |
| phone-state (4) | I | I | I | P | I | I |
| text-risk (4) | P | P | P | P | P | P |
| duplicate (8) | P | P | P | P | P | P |
| sanctions (10) | N | N | N | N | N | N |
| linkedin-format (4) | I | I | I | I | I | I |
| business-card (10) | N | N | N | N | N | N |
| invite-source (6) | N | N | N | N | N | N |
| plausibility (4) | P | P | P | P | P | P |
| velocity (4) | P | P | P | P | P | P |
| social-links (2) | I | I | I | I | I | I |
| business-registry (8) | N | N | I | N | N | P |
| address (2) | P | F | P | P | P | P |
| mx (6) | P | P | P | P | P | P |
| website (4) | N | N | I | N | N | N |
| linkedin-fetch (4) | U | U | U | U | U | U |
| screen-x (4) | U | U | U | U | U | U |
| screen-facebook (4) | U | U | U | U | U | U |
| screen-instagram (4) | U | U | U | U | U | U |
| screen-youtube (4) | U | U | U | U | U | U |
| screen-tiktok (4) | I | I | I | I | I | I |
| screen-news (4) | I | I | I | I | I | I |
| screen-web (4) | I | I | I | I | I | I |
| web-footprint (4) | I | I | I | I | I | I |
| edgar (12) | I | I | I | I | I | P |
| courts (0) | P | P | P | P | P | P |
| opencorporates (0) | U | U | U | U | U | U |
| opensanctions (0) | U | U | U | U | U | U |
| news (8) | I | I | I | I | I | I |
| rdap (4) |  |  | F |  |  |  |

`*` = corroborates=true, `!` = hard flag.

## Reasons and notes

## Source health (preflight)

| Source | HTTP | ms |
|---|---|---|
| CourtListener v4 | 200 | 443 |
| SEC company_tickers | 200 | 71 |
| SEC efts (URL as used by edgar.ts) | 200 | 523 |
| DuckDuckGo html | 200 | 565 |
| Bing web | 200 | 104 |
| Google News RSS | 200 | 488 |
| GDELT doc API | 429 | 12581 |
| OFAC sdn.csv (HEAD) | 200 | 8654 |
| rdap.org | 200 | 160 |
| OpenSanctions API (expected 401) | 401 | 215 |
| OpenCorporates API (expected 401) | 401 | 461 |
| DNS MX gmail.com (ok) | 200 | 18 |

UNAVAILABLE counts per check across 6 cases: linkedin-fetch=6, screen-x=6, screen-facebook=6, screen-instagram=6, screen-youtube=6, opencorporates=6, opensanctions=6.
