# Verification benchmark - thirteenth-d

Rubric 2026-10-25. Run started 10/26/2026, 9:36:32 PM (America/New_York). Network ON, free sources only.

> GROUND TRUTH TO BE CONFIRMED BY RICHARD. Person-to-company links and titles for REAL cases are the benchmark author's public-knowledge assumptions. They are NOT verified and the harness never asserts a current job title. Cases marked companyOnly only expect company corroboration.

OFAC: sdn.csv from <24h cache; alt.csv from <24h cache; 39614 watchlist entries parsed (same parser as the app's refreshWatchlist)

## Results

| Case | Kind | Case label | Expected | Grade | Score | Conf | Recommendation | Legacy | Cov all / net | Result |
|---|---|---|---|---|---|---|---|---|---|---|
| F01 | fake | Control 1: invented firm, Gmail, no site | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 44 | Low | NEEDS MORE INFO | 46 NEEDS_OWNER_DECISION | 41.7% / 9.1% | **PASS** |
| F02 | fake | Control 2: invented firm, mailinator, no site/LinkedIn | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 40 | Low | DECLINE | 36 NOT_LEGIT | 43.7% / 0% | **PASS** |
| F03a | fake | Control 3a: impersonation - Gmail + 'Prologis' + made-up person, no s… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 44 | Low | NEEDS MORE INFO | 49 NEEDS_OWNER_DECISION | 41.7% / 9.1% | **PASS** |
| F03b | fake | Control 3b: impersonation - made-up person + 'Prologis' + the REAL pr… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 50 | Low | NEEDS MORE INFO | 55 NEEDS_OWNER_DECISION | 48.4% / 20% | **PASS** |
| F04 | fake | Control 4: invented firm with self-hosted page naming the person | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 54 | Low | NEEDS MORE INFO | 48 NEEDS_OWNER_DECISION | 44.4% / 15.2% | **PASS** |
| F04b | fake | Control 4b (padded): F04 plus format-valid LinkedIn, matching-area-co… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 59 | Low | NEEDS MORE INFO | 55 NEEDS_OWNER_DECISION | 51% / 15.2% | **PASS** |
| F05 | fake | Control 5: fraud text with invented firm | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 40 | Low | DECLINE | 41 NOT_LEGIT | 44.7% / 9.1% | **PASS** |
| F06a | fake | Control 6a: real OFAC SDN individual + location matching the list (fu… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 36 | Low | DECLINE | 38 NOT_LEGIT | 45.3% / 9.1% | **PASS** |
| F06b | fake | Control 6b: same SDN individual, US location (name-only match, uncorr… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 36 | Low | NEEDS MORE INFO | 36 NEEDS_OWNER_DECISION | 45.3% / 9.1% | **PASS** |
| F06c | fake | Control 6c: BUG PROBE - same as F01 but with an EMPTY watchlist cache… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 36 | Low | NEEDS MORE INFO | 42 NEEDS_OWNER_DECISION | 35.1% / 9.1% | **PASS** |
| F07a | fake | Control 7a: real exec (Stephen Ross) paired with a different real com… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 44 | Low | NEEDS MORE INFO | 46 NEEDS_OWNER_DECISION | 41.7% / 9.1% | **PASS** |
| F07b | fake | Control 7b: real exec (Larry Silverstein) paired with Toll Brothers +… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 54 | Low | NEEDS MORE INFO | 52 NEEDS_OWNER_DECISION | 48.4% / 25.7% | **PASS** |
| F08a | fake | Hard fake 8a: copycat spelling of Blackstone, made-up person, no site | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 44 | Low | NEEDS MORE INFO | 46 NEEDS_OWNER_DECISION | 41.7% / 9.1% | **PASS** |
| F08b | fake | Hard fake 8b: copycat spelling of Toll Brothers with self-hosted page… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 54 | Low | NEEDS MORE INFO | 48 NEEDS_OWNER_DECISION | 44.4% / 15.2% | **PASS** |
| B4R05 | real | Starwood Property Trust / Barry Sternlicht | not F/DECLINE; company corroborated where public | F | 59 | Medium | NEEDS MORE INFO | 70 NEEDS_OWNER_DECISION | 62.3% / 51.4% | **FAIL** FN |
| B4F01 | fake | Batch-4 fake: invented bridge lender, nonexistent website, personal L… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 46 | Low | NEEDS MORE INFO | 49 NEEDS_OWNER_DECISION | 48.4% / 20% | **PASS** |
| B8F01 | fake | Fake control: Blorptex Qwvzn Builders LLC | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 36 | Low | NEEDS MORE INFO | 42 NEEDS_OWNER_DECISION | 48.4% / 20% | **PASS** |
| B5R04 | real | Meister Seelig & Schuster / Stephen B. Meister | not F/DECLINE; company corroborated where public | C | 71 | Medium | NEEDS MORE INFO | 66 NEEDS_OWNER_DECISION | 62.3% / 40.5% | **PASS** |
| B5R05 | real | Arbor Realty Trust / Ivan Kaufman | not F/DECLINE; company corroborated where public | D | 67 | Medium | NEEDS MORE INFO | 66 NEEDS_OWNER_DECISION | 61.3% / 48.6% | **PASS** FN |
| B5F01 | fake | Batch-5 fake: invented REIT-style lender, nonexistent website and Lin… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 46 | Low | NEEDS MORE INFO | 49 NEEDS_OWNER_DECISION | 48.4% / 20% | **PASS** |
| B6R02 | real | LeFrak Organization / Richard LeFrak | not F/DECLINE; company corroborated where public | B | 81 | High | APPROVE WITH CONDITIONS | 76 NEEDS_OWNER_DECISION | 71.9% / 62.8% | **PASS** |
| B6R04 | real | Kramer Levin Naftalis & Frankel LLP (now HSF Kramer) / Jay A. Neveloff | not F/DECLINE; company corroborated where public | D | 61 | Medium | NEEDS MORE INFO | 63 NEEDS_OWNER_DECISION | 59.3% / 46.3% | **PASS** FN |
| B6F01 | fake | Batch-6 fake: invented capital-partners LLC, nonexistent website and … | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 46 | Low | NEEDS MORE INFO | 46 NEEDS_OWNER_DECISION | 48.4% / 20% | **PASS** |
| B7R01 | real | Vornado Realty Trust / Steven Roth | not F/DECLINE; company corroborated where public | B | 85 | High | APPROVE WITH CONDITIONS | 86 NEEDS_OWNER_DECISION | 81.3% / 81.4% | **PASS** |
| B7R02 | real | Skanska USA / Richard Kennedy | not F/DECLINE; company corroborated where public | C | 71 | Medium | APPROVE WITH CONDITIONS | 73 NEEDS_OWNER_DECISION | 68.1% / 53.8% | **PASS** |
| B7R03 | real | Avison Young / James Nelson | not F/DECLINE; company corroborated where public | C | 71 | Medium | APPROVE WITH CONDITIONS | 64 NEEDS_OWNER_DECISION | 59.7% / 45.9% | **PASS** |
| B7F01 | fake | Batch-7 fake: invented capital-holdings LLC, nonexistent website and … | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 46 | Low | NEEDS MORE INFO | 46 NEEDS_OWNER_DECISION | 48.4% / 20% | **PASS** |

## Counts

- Cases: 27; PASS 26, FAIL 1, ERROR 0.
- False positives (fake or QA control reaching APPROVE* or grade >= C): **0** 
- False negatives (real entity graded D/F or DECLINE): **3** (B4R05, B5R05, B6R04)

## Per-check status matrix

P=PASS F=FAIL I=INCONCLUSIVE U=UNAVAILABLE N=NOT_RUN, blank = check not emitted. Weights in the key column are the PASS-time weights seen first.

| Check (weight) | F01 | F02 | F03a | F03b | F04 | F04b | F05 | F06a | F06b | F06c | F07a | F07b | F08a | F08b | B4R05 | B4F01 | B8F01 | B5R04 | B5R05 | B5F01 | B6R02 | B6R04 | B6F01 | B7R01 | B7R02 | B7R03 | B7F01 |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| email-syntax (5) | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| email-provider (2) | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| disposable-email (8) | P | F! | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| role-address (4) | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| phone-state (4) | I | I | I | I | I | P | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I |
| text-risk (4) | P | P | P | P | P | P | F! | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| duplicate (8) | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| sanctions (10) | P | P | P | P | P | P | P | F! | F | N | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| linkedin-format (4) | I | I | I | P | I | P | I | I | I | I | I | I | I | I | P | P | P | P | P | P | P | P | P | P | P | P | P |
| business-card (10) | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N |
| invite-source (6) | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| plausibility (4) | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | F | P | P | P | P | P | P | P | P | P | P |
| velocity (4) | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| social-links (2) | I | I | I | I | I | P | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I |
| address (2) | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | F | P | P | P | P | P | P | P | P | P | P |
| mx (6) | P | N | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| website (4) | N | N | N | U | P | P | N | N | N | N | N | P | N | P | I | F | F | P | P | F | P | U | F | P | U | P | F |
| linkedin-fetch (4) | U | U | U | P | U | U | U | U | U | U | U | P | U | U | P | U | U | P | P | U | P* | P | U | P | P | P | U |
| screen-x (4) | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U |
| screen-facebook (4) | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | I | U | U | U | U | U | U | U | U |
| screen-instagram (4) | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U |
| screen-youtube (4) | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | P* | I | I | P* | P* | I | P* | P* | P* | I |
| screen-tiktok (4) | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I |
| screen-news (4) | I | I | I | I | I | I | I | I | I | I | I | I | I | I | P | I | I | I | I | I | I | I | I | P | P | I | I |
| screen-web (4) | I | I | I | I | I | I | I | I | I | I | I | I | I | I | P | I | I | P | P | I | P* | P* | I | P* | P | P | I |
| web-footprint (4) | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | P* | P* | I | P* | I | I | I |
| business-registry (8) | I | I | N | N | I | I | I | N | I | I | I | I | I | I | N | N | I | P | I | N | P | I | I | P | P | I | I |
| edgar (12) | I | I | I | I | I | I | I | I | I | I | I | I | I | I | P* | I | I | I | P* | I | I | I | I | P* | I | I | I |
| courts (0) | I | P | P | P | P | P | P | U | P | I | I | P | U | U | P | P | P | P | P | U | P | P | P | I | I | I | P |
| opencorporates (0) | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U |
| opensanctions (0) | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U |
| news (8) | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | P* | I | I | P* | P* | P* | I |
| rdap (4) |  |  |  | P |  |  |  |  |  |  |  | P |  |  | P | F | F | P | P | F | P | P | F | P | P | U | F |

`*` = corroborates=true, `!` = hard flag.

## Reasons and notes

### F02 - Control 2: invented firm, mailinator, no site/LinkedIn
- Caps applied: Capped at F: The email domain is disposable (Bundled disposable-domain list).

### F04 - Control 4: invented firm with self-hosted page naming the person
- Self-hosted fixture page at http://127.0.0.1:35861/F04/

### F04b - Control 4b (padded): F04 plus format-valid LinkedIn, matching-area-code phone, and a social URL - tests how close a cosmetic fake gets to grade C
- Self-hosted fixture page at http://127.0.0.1:35861/F04b/

### F05 - Control 5: fraud text with invented firm
- Caps applied: Capped at F: The write-up matches a fraud pattern: guaranteed returns together with a request to send funds (Local text heuristic).

### F06a - Control 6a: real OFAC SDN individual + location matching the list (full OFAC cache)
- SDN individual ent#15888 "LOGUNOV, Oleg" pulled from downloaded sdn.csv (remarks: DOB 04 Feb 1962; POB Irkutsk Region, Russia.)
- Caps applied: Capped at F: A sanctions list name matches, and the location or date of birth on the application lines up with the list entry (OFAC SDN cache). Confirm the entry before you decide.

### F06b - Control 6b: same SDN individual, US location (name-only match, uncorroborated)
- SDN individual ent#15888 "LOGUNOV, Oleg" pulled from downloaded sdn.csv (remarks: DOB 04 Feb 1962; POB Irkutsk Region, Russia.)

### F08b - Hard fake 8b: copycat spelling of Toll Brothers with self-hosted page naming the person
- Self-hosted fixture page at http://127.0.0.1:35861/F08b/

### B4R05 - Starwood Property Trust / Barry Sternlicht
- Ground truth to be confirmed by Richard: Barry Sternlicht - https://www.starwoodpropertytrust.com/team/ (Chairman & CEO); DEF 14A 2026-03-13; 8-K 2026-04-24 re-elected director; SEC filer STARWOOD PROPERTY TRUST, INC. CIK 1465128. LinkedIn slug starwoodproperty confirmed via search.; title unconfirmed by Richard
- False negative: grade F / NEEDS MORE INFO.
- website=INCONCLUSIVE: Searched: https://www.starwoodpropertytrust.com. No result found that names this person and this company. Name: no. Company: no. City: no. Confidence…
- screen-x=UNAVAILABLE: Searched: "Barry Sternlicht" "starwood" on X. X blocked automated access. Couldn't check for free. Not checkable for free.
- screen-facebook=UNAVAILABLE: Searched: "Barry Sternlicht" "starwood" on Facebook. Facebook blocked automated access. Couldn't check for free. Not checkable for free.
- screen-instagram=UNAVAILABLE: Searched: Starwood Property Trust on Instagram. Instagram blocked automated access. Couldn't check for free. Not checkable for free.
- screen-youtube=INCONCLUSIVE: Searched: "Barry Sternlicht" "starwood" on YouTube. no match found Name: yes. Company: no. City: no. Confidence: low.
- screen-tiktok=INCONCLUSIVE: Searched: "Barry Sternlicht" "starwood" on TikTok. no match found Name: no. Company: no. City: no. Confidence: none.
- web-footprint=INCONCLUSIVE: Searched: "Barry Sternlicht" "Starwood Property Trust" "Miami Beach". same source as screen-news Name: no. Company: no. City: no. Confidence: none.
- news=INCONCLUSIVE: Company-level litigation headline. A lawsuit or similar civil term names the company. This is an attention item for Richard, not an automatic review …

### B5R04 - Meister Seelig & Schuster / Stephen B. Meister
- Ground truth to be confirmed by Richard: Stephen Meister - meisterseelig.com/position/co-founder (Co-Founder); firm press release 2026-01-20; rename announced 2026-04-09; title unconfirmed by Richard
- Caps applied: Capped at C: fewer than two independent sources tied this person to this company

### B5R05 - Arbor Realty Trust / Ivan Kaufman
- Ground truth to be confirmed by Richard: Ivan Kaufman - arbor.com/our-team/ivan-kaufman (Chairman, CEO, President); SEC proxy 2026-04-16; 10-K cert 2026-02-27; title unconfirmed by Richard
- False negative: grade D / NEEDS MORE INFO.
- screen-x=UNAVAILABLE: Searched: "Ivan Kaufman" "arbor" on X. The company website links https://twitter.com/arbor1, and X blocked automated access. Couldn't check for free.…
- screen-facebook=INCONCLUSIVE: Searched: "Ivan Kaufman" "arbor" on Facebook. no match found Name: no. Company: yes. City: yes. Confidence: medium.
- screen-instagram=UNAVAILABLE: Searched: Arbor Realty Trust on Instagram. The company website links https://www.instagram.com/arborrealtytrust/, and Instagram blocked automated acc…
- screen-youtube=INCONCLUSIVE: Searched: "Ivan Kaufman" "arbor" on YouTube. no match found Name: no. Company: no. City: no. Confidence: none.
- screen-tiktok=INCONCLUSIVE: Searched: "Ivan Kaufman" "arbor" on TikTok. no match found Name: no. Company: no. City: no. Confidence: none.
- screen-news=INCONCLUSIVE: Searched: "Ivan Kaufman" "arbor" / "Kaufman" "arbor". Company-level litigation headline. Arbor hit with lawsuit over finder’s fee in Emerald Empire d…
- web-footprint=INCONCLUSIVE: Searched: "Ivan Kaufman" "Arbor Realty Trust" "Uniondale". No result found that names this person and this company. Name: no. Company: no. City: no. …
- news=INCONCLUSIVE: Company-level litigation headline. A lawsuit or similar civil term names the company. This is an attention item for Richard, not an automatic review …

### B6R02 - LeFrak Organization / Richard LeFrak
- Ground truth to be confirmed by Richard: Richard LeFrak - CNBC 2026-07-15 and 2026-09-29 (LeFrak Organization CEO); lefrak.com/news-and-press (Chairman and CEO); TRD 2025-02-27 says firm calls him executive chairman; title unconfirmed by Richard

### B6R04 - Kramer Levin Naftalis & Frankel LLP (now HSF Kramer) / Jay A. Neveloff
- Ground truth to be confirmed by Richard: Jay Neveloff - hsfkramer.com/our-people/j/jay-a-neveloff (Partner, Chair of Real Estate US); kramerlevin.com/en/people/jay-a-neveloff.html (archived Kramer Levin bio); HSF Kramer news 2026-05-12 (CO Power 100 2026); title unconfirmed by Richard
- False negative: grade D / NEEDS MORE INFO.
- website=UNAVAILABLE: Searched: https://www.kramerlevin.com. blocked by site (403) — not checkable for free; ask applicant for a team-page URL The site redirected to https…
- screen-x=UNAVAILABLE: Searched: "Jay Neveloff" "kramer levin naftalis frankel" on X. X blocked automated access. Couldn't check for free. Not checkable for free.
- screen-facebook=UNAVAILABLE: Searched: "Jay Neveloff" "kramer levin naftalis frankel" on Facebook. Facebook blocked automated access. Couldn't check for free. Not checkable for f…
- screen-instagram=UNAVAILABLE: Searched: Kramer Levin Naftalis & Frankel LLP on Instagram. Instagram blocked automated access. Couldn't check for free. Not checkable for free.
- screen-tiktok=INCONCLUSIVE: Searched: "Jay Neveloff" "kramer levin naftalis frankel" on TikTok. no match found Name: no. Company: no. City: no. Confidence: none.
- screen-news=INCONCLUSIVE: Searched: "Jay Neveloff" "kramer levin naftalis frankel" / "Neveloff" "kramer levin naftalis frankel". no match found Name: no. Company: no. City: no…
- edgar=INCONCLUSIVE: EDGAR responded. No company on the SEC list uses this firm's name.
- news=INCONCLUSIVE: Company-level litigation headline. A lawsuit or similar civil term names the company. This is an attention item for Richard, not an automatic review …

### B7R01 - Vornado Realty Trust / Steven Roth
- Ground truth to be confirmed by Richard: Steven Roth - vno.com/governance/executive-management (Chairman of the Board and CEO); SEC DEF 14A 2026-04-07; SEC 10-Q exhibit 31.1 signed 2026-08-03 as Chairman and CEO; title unconfirmed by Richard

### B7R02 - Skanska USA / Richard Kennedy
- Ground truth to be confirmed by Richard: Richard Kennedy - skanska.com/us/en/about-us/skanska-in-the-u.s/quick-facts (President and CEO Skanska USA); skanska.com group management page (EVP Skanska AB, Group Leadership Team); title unconfirmed by Richard

### B7R03 - Avison Young / James Nelson
- Ground truth to be confirmed by Richard: James Nelson - avisonyoung.us/w/james-nelson (Principal, Head of U.S. Investment Sales); Avison Young press release 2025-03-12; CoStar 2026-02-17; title unconfirmed by Richard

## Source health (preflight)

| Source | HTTP | ms |
|---|---|---|
| CourtListener v4 | 200 | 320 |
| SEC company_tickers | 200 | 116 |
| SEC efts (URL as used by edgar.ts) | 200 | 426 |
| DuckDuckGo html | 200 | 649 |
| Bing web | 200 | 121 |
| Google News RSS | 200 | 486 |
| GDELT doc API | 200 | 14178 |
| OFAC sdn.csv (HEAD) | 200 | 10692 |
| rdap.org | 200 | 148 |
| OpenSanctions API (expected 401) | 401 | 363 |
| OpenCorporates API (expected 401) | 401 | 518 |
| DNS MX gmail.com (ok) | 200 | 22 |

UNAVAILABLE counts per check across 27 cases: linkedin-fetch=17, screen-x=27, screen-facebook=26, screen-instagram=27, opencorporates=27, opensanctions=27, website=3, courts=4, rdap=1.
