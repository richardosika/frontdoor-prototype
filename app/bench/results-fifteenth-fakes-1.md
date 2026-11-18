# Verification benchmark - fifteenth-fakes-1

Rubric 2026-10-25. Run started 10/27/2026, 2:23:53 AM (America/New_York). Network ON, free sources only.

> GROUND TRUTH TO BE CONFIRMED BY RICHARD. Person-to-company links and titles for REAL cases are the benchmark author's public-knowledge assumptions. They are NOT verified and the harness never asserts a current job title. Cases marked companyOnly only expect company corroboration.

OFAC: sdn.csv from <24h cache; alt.csv from <24h cache; 39614 watchlist entries parsed (same parser as the app's refreshWatchlist)

## Results

| Case | Kind | Case label | Expected | Grade | Score | Conf | Recommendation | Legacy | Cov all / net | Result |
|---|---|---|---|---|---|---|---|---|---|---|
| F04 | fake | Control 4: invented firm with self-hosted page naming the person | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 46 | Low | NEEDS MORE INFO | 48 NEEDS_OWNER_DECISION | 44.4% / 15.2% | **PASS** |
| F04b | fake | Control 4b (padded): F04 plus format-valid LinkedIn, matching-area-co… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 48 | Low | NEEDS MORE INFO | 55 NEEDS_OWNER_DECISION | 51% / 15.2% | **PASS** |
| F06a | fake | Control 6a: real OFAC SDN individual + location matching the list (fu… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 36 | Low | DECLINE | 38 NOT_LEGIT | 45.3% / 9.1% | **PASS** |
| F06b | fake | Control 6b: same SDN individual, US location (name-only match, uncorr… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 36 | Low | NEEDS MORE INFO | 36 NEEDS_OWNER_DECISION | 45.3% / 9.1% | **PASS** |
| F07b | fake | Control 7b: real exec (Larry Silverstein) paired with Toll Brothers +… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 50 | Low | NEEDS MORE INFO | 52 NEEDS_OWNER_DECISION | 48.4% / 25.7% | **PASS** |
| F08b | fake | Hard fake 8b: copycat spelling of Toll Brothers with self-hosted page… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 46 | Low | NEEDS MORE INFO | 48 NEEDS_OWNER_DECISION | 44.4% / 15.2% | **PASS** |

## Counts

- Cases: 6; PASS 6, FAIL 0, ERROR 0.
- False positives (fake or QA control reaching APPROVE* or grade >= C): **0** 
- False negatives (real entity graded D/F or DECLINE): **0** 

## Per-check status matrix

P=PASS F=FAIL I=INCONCLUSIVE U=UNAVAILABLE N=NOT_RUN, blank = check not emitted. Weights in the key column are the PASS-time weights seen first.

| Check (weight) | F04 | F04b | F06a | F06b | F07b | F08b |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| email-syntax (5) | P | P | P | P | P | P |
| email-provider (2) | P | P | P | P | P | P |
| disposable-email (8) | P | P | P | P | P | P |
| role-address (4) | P | P | P | P | P | P |
| phone-state (4) | I | P | I | I | I | I |
| text-risk (4) | P | P | P | P | P | P |
| duplicate (8) | P | P | P | P | P | P |
| sanctions (10) | P | P | F! | F | P | P |
| linkedin-format (4) | I | P | I | I | I | I |
| business-card (10) | N | N | N | N | N | N |
| invite-source (6) | P | P | P | P | P | P |
| plausibility (4) | P | P | P | P | P | P |
| velocity (4) | P | P | P | P | P | P |
| social-links (2) | I | P | I | I | I | I |
| address (2) | P | P | P | P | P | P |
| mx (6) | P | P | P | P | P | P |
| website (4) | P | P | N | N | P | P |
| linkedin-fetch (4) | U | U | U | U | P | U |
| screen-x (4) | U | U | U | U | U | U |
| screen-facebook (4) | U | U | U | U | U | U |
| screen-instagram (4) | U | U | U | U | U | U |
| screen-youtube (4) | I | I | I | I | I | I |
| screen-tiktok (4) | I | I | I | I | I | I |
| screen-news (4) | I | I | I | I | I | I |
| screen-web (4) | U | I | U | U | I | I |
| web-footprint (4) | U | I | U | U | I | I |
| business-registry (8) | I | I | N | I | I | I |
| edgar (12) | I | I | I | I | I | I |
| courts (0) | P | P | P | P | P | U |
| opencorporates (0) | U | U | U | U | U | U |
| opensanctions (0) | U | U | U | U | U | U |
| news (8) | I | I | I | I | I | I |
| rdap (4) |  |  |  |  | P |  |

`*` = corroborates=true, `!` = hard flag.

## Reasons and notes

### F04 - Control 4: invented firm with self-hosted page naming the person
- Self-hosted fixture page at http://127.0.0.1:33397/F04/

### F04b - Control 4b (padded): F04 plus format-valid LinkedIn, matching-area-code phone, and a social URL - tests how close a cosmetic fake gets to grade C
- Self-hosted fixture page at http://127.0.0.1:33397/F04b/

### F06a - Control 6a: real OFAC SDN individual + location matching the list (full OFAC cache)
- SDN individual ent#15888 "LOGUNOV, Oleg" pulled from downloaded sdn.csv (remarks: DOB 04 Feb 1962; POB Irkutsk Region, Russia.)
- Caps applied: Capped at F: A sanctions list name matches, and the location or date of birth on the application lines up with the list entry (OFAC SDN cache). Confirm the entry before you decide.

### F06b - Control 6b: same SDN individual, US location (name-only match, uncorroborated)
- SDN individual ent#15888 "LOGUNOV, Oleg" pulled from downloaded sdn.csv (remarks: DOB 04 Feb 1962; POB Irkutsk Region, Russia.)

### F08b - Hard fake 8b: copycat spelling of Toll Brothers with self-hosted page naming the person
- Self-hosted fixture page at http://127.0.0.1:33397/F08b/

## Source health (preflight)

| Source | HTTP | ms |
|---|---|---|
| CourtListener v4 | 200 | 13841 |
| SEC company_tickers | 200 | 125 |
| SEC efts (URL as used by edgar.ts) | 200 | 471 |
| DuckDuckGo html | 202 | 127 |
| Bing web | 200 | 112 |
| Google News RSS | 200 | 523 |
| GDELT doc API | 200 | 14508 |
| OFAC sdn.csv (HEAD) | 200 | 11934 |
| rdap.org | 200 | 204 |
| OpenSanctions API (expected 401) | 401 | 350 |
| OpenCorporates API (expected 401) | 401 | 490 |
| DNS MX gmail.com (ok) | 200 | 20 |

UNAVAILABLE counts per check across 6 cases: linkedin-fetch=5, screen-x=6, screen-facebook=6, screen-instagram=6, screen-web=3, web-footprint=3, opencorporates=6, opensanctions=6, courts=1.
