# Verification benchmark - before-run1 (first full run; kept for run-to-run stability comparison)

Rubric 2026-10-25. Run started 10/26/2026, 10:26:34 AM (America/New_York). Network ON, free sources only.

> GROUND TRUTH TO BE CONFIRMED BY RICHARD. Person-to-company links and titles for REAL cases are the benchmark author's public-knowledge assumptions. They are NOT verified and the harness never asserts a current job title. Cases marked companyOnly only expect company corroboration.

OFAC: sdn.csv from <24h cache; alt.csv from <24h cache; 39614 watchlist entries parsed (same parser as the app's refreshWatchlist)

## Results

| Case | Kind | Case label | Expected | Grade | Score | Conf | Recommendation | Legacy | Cov all / net | Result |
|---|---|---|---|---|---|---|---|---|---|---|
| R01 | real (company only) | Prologis (company only) | not F/DECLINE; company-only corroboration | C | 73 | Medium | APPROVE WITH CONDITIONS | 84 LEGIT | 60.2% / 51.9% | **PASS** |
| R02 | real | Blackstone / Jonathan Gray | not F/DECLINE; company corroborated where public | D | 73 | Medium | NEEDS MORE INFO | 76 NEEDS_OWNER_DECISION | 60.2% / 51.9% | **PASS** FN |
| R03 | real | Related Companies / Stephen Ross | not F/DECLINE; company corroborated where public | C | 75 | Medium | APPROVE WITH CONDITIONS | 77 LEGIT | 56.9% / 46.4% | **PASS** |
| R04 | real | Tishman Speyer / Rob Speyer | not F/DECLINE; company corroborated where public | C | 77 | Medium | APPROVE WITH CONDITIONS | 86 LEGIT | 60.2% / 51.9% | **PASS** |
| R05 | real | Hines / Jeff Hines | not F/DECLINE; company corroborated where public | D | 63 | Medium | NEEDS MORE INFO | 73 NEEDS_OWNER_DECISION | 56.9% / 46.4% | **PASS** FN |
| R06 | real | Silverstein Properties / Larry Silverstein | not F/DECLINE; company corroborated where public | C | 79 | Medium | APPROVE WITH CONDITIONS | 75 LEGIT | 53.9% / 40.7% | **PASS** |
| R07 | real (company only) | Veris Residential (company only) | not F/DECLINE; company-only corroboration | B | 81 | Medium | APPROVE WITH CONDITIONS | 80 LEGIT | 57.2% / 46.2% | **PASS** |
| R08 | real | Hovnanian Enterprises / Ara Hovnanian | not F/DECLINE; company corroborated where public | B | 81 | Medium | APPROVE WITH CONDITIONS | 80 LEGIT | 57.2% / 46.2% | **PASS** |
| R09 | real (company only) | Toll Brothers (company only) | not F/DECLINE; company-only corroboration | F | 59 | Medium | NEEDS MORE INFO | 59 NEEDS_OWNER_DECISION | 43.2% / 20% | **FAIL** FN |
| R10 | real (company only) | Greystar (company only) | not F/DECLINE; company-only corroboration | D | 63 | Medium | NEEDS MORE INFO | 67 NEEDS_OWNER_DECISION | 53.9% / 40.7% | **PASS** FN |
| F01 | fake | Control 1: invented firm, Gmail, no site | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 52 | Medium | NEEDS MORE INFO | 58 NEEDS_OWNER_DECISION | 36% / 8.7% | **PASS** |
| F02 | fake | Control 2: invented firm, mailinator, no site/LinkedIn | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 40 | Low | DECLINE | 42 NOT_LEGIT | 38% / 0% | **PASS** |
| F03a | fake | Control 3a: impersonation - Gmail + 'Prologis' + made-up person, no s… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 58 | Medium | NEEDS MORE INFO | 71 NEEDS_OWNER_DECISION | 46.4% / 29.2% | **PASS** |
| F03b | fake | Control 3b: impersonation - made-up person + 'Prologis' + the REAL pr… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 57 | Medium | NEEDS MORE INFO | 66 NEEDS_OWNER_DECISION | 42.9% / 17.4% | **PASS** |
| F04 | fake | Control 4: invented firm with self-hosted page naming the person | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | D | 62 | Medium | NEEDS MORE INFO | 61 NEEDS_OWNER_DECISION | 38.8% / 16% | **PASS** |
| F05 | fake | Control 5: fraud text with invented firm | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 40 | Low | DECLINE | 45 NOT_LEGIT | 35.2% / 0% | **PASS** |
| F06a | fake | Control 6a: real OFAC SDN individual + location matching the list (fu… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 44 | Medium | DECLINE | 45 NOT_LEGIT | 39.5% / 8.7% | **PASS** |
| F06b | fake | Control 6b: same SDN individual, US location (name-only match, uncorr… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 36 | Low | NEEDS MORE INFO | 39 NEEDS_OWNER_DECISION | 35.9% / 0% | **PASS** |
| F06c | fake | Control 6c: BUG PROBE - same as F01 but with an EMPTY watchlist cache… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 44 | Low | NEEDS MORE INFO | 52 NEEDS_OWNER_DECISION | 32.2% / 0% | **FAIL** |
| F07a | fake | Control 7a: real exec (Stephen Ross) paired with a different real com… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 52 | Medium | NEEDS MORE INFO | 65 NEEDS_OWNER_DECISION | 44.1% / 25% | **PASS** |
| F07b | fake | Control 7b: real exec (Larry Silverstein) paired with Toll Brothers +… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 56 | Medium | NEEDS MORE INFO | 55 NEEDS_OWNER_DECISION | 37.4% / 12.5% | **PASS** |
| F08a | fake | Hard fake 8a: copycat spelling of Blackstone, made-up person, no site | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 44 | Low | NEEDS MORE INFO | 52 NEEDS_OWNER_DECISION | 32.2% / 0% | **PASS** |
| F08b | fake | Hard fake 8b: copycat spelling of Toll Brothers with self-hosted page… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 46 | Low | NEEDS MORE INFO | 49 NEEDS_OWNER_DECISION | 31.4% / 0% | **PASS** |

## Counts

- Cases: 23; PASS 21, FAIL 2, ERROR 0.
- False positives (fake reaching APPROVE* or grade >= C): **0** 
- False negatives (real entity graded D/F or DECLINE): **4** (R02, R05, R09, R10)

## Per-check status matrix

P=PASS F=FAIL I=INCONCLUSIVE U=UNAVAILABLE N=NOT_RUN, blank = check not emitted. Weights in the key column are the PASS-time weights seen first.

| Check (weight) | R01 | R02 | R03 | R04 | R05 | R06 | R07 | R08 | R09 | R10 | F01 | F02 | F03a | F03b | F04 | F05 | F06a | F06b | F06c | F07a | F07b | F08a | F08b |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| email-syntax (5) | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| email-provider (2) | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| disposable-email (8) | P | P | P | P | P | P | P | P | P | P | P | F! | P | P | P | P | P | P | P | P | P | P | P |
| role-address (4) | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| phone-state (4) | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I |
| text-risk (4) | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | F! | P | P | P | P | P | P | P |
| duplicate (8) | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| sanctions (10) | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | F! | F | P | P | P | P | P |
| linkedin-format (4) | P | P | P | P | P | P | P | P | P | P | I | I | I | P | I | I | I | I | I | I | I | I | I |
| business-card (10) | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N |
| invite-source (6) | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| plausibility (4) | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| velocity (4) | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| social-links (2) | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I |
| business-registry (8) | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N |
| mx (6) | U | U | U | U | U | U | U | U | U | U | U | N | U | U | U | U | U | U | U | U | U | U | U |
| rdap (4) | P | P | P | P | P | P | P | P | P | P |  |  |  | P | I |  |  |  |  |  | P |  | I |
| website (4) | U | P* | P* | U | U | P* | P* | P* | I | I | U | U | U | U | P* | U | U | U | U | U | I | U | I |
| linkedin-fetch (4) | I | I | I | P* | P* | P* | I | I | I | P* | U | U | U | I | U | U | U | U | U | U | I | U | U |
| screen-x (4) | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U |
| screen-facebook (4) | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U |
| screen-instagram (4) | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U |
| screen-youtube (8) | P* | I | P* | P* | P* | P* | P* | P* | P* | P* | P* | I | P* | I | I | I | P* | I | I | P* | P* | I | I |
| screen-tiktok (4) | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I |
| screen-news (8) | P* | P* | P* | P* | P* | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I |
| screen-web (8) | P* | P* | P* | U | P* | U | U | U | I | P* | U | U | U | U | U | U | U | U | U | U | U | U | U |
| web-footprint (8) | P* | P* | P* | P* | P* | P* | P* | P* | P* | P* | U | U | P* | U | P* | U | U | U | U | P* | U | U | U |
| edgar (12) | P* | P* | I | P* | I | I | P* | P* | I | I | I | I | P* | P* | I | I | I | I | I | I | I | I | I |
| courts (8) | I | I | I | I | I | I | I | I | I | I | I | I | I | I | U | I | I | I | I | U | I | I | I |
| opencorporates (6) | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U |
| opensanctions (8) | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U |
| news (8) | P* | F | P* | P* | F | P* | P* | P* | I | F | I | I | I | I | I | I | I | I | I | F | I | I | I |
| news-story (0) | P | F | P | P | F | P | P | P | I | F |  |  | I | I |  |  |  |  |  | F | I |  |  |
| news-story#2 (0) | P | F | P | P | P | P | P | P | I | F |  |  | I | I |  |  |  |  |  | I | I |  |  |
| news-story#3 (0) | P | P | P | P | I | P | P | P | I | F |  |  | I | I |  |  |  |  |  | I | I |  |  |
| news-story#4 (0) | P | P | P | I | I | I | P | I | I | F |  |  | I | I |  |  |  |  |  | I | I |  |  |
| news-story#5 (0) | P | P | P | I | I | I | I | I | I | P |  |  | I | I |  |  |  |  |  | I |  |  |  |
| news-story#6 (0) | P | P | P | I | I | I | I | I |  | P |  |  | I | I |  |  |  |  |  | I |  |  |  |
| news-story#7 (0) | P | P | I | I | I | I | I | I |  | I |  |  | I | I |  |  |  |  |  | I |  |  |  |
| news-story#8 (0) | P | P | I | I | I | I | I | I |  | I |  |  | I | I |  |  |  |  |  | I |  |  |  |

`*` = corroborates=true, `!` = hard flag.

## Reasons and notes

### R01 - Prologis (company only)
- Ground truth to be confirmed by Richard: Hamid Moghadam - assumed Prologis co-founder/executive; unverified

### R02 - Blackstone / Jonathan Gray
- Ground truth to be confirmed by Richard: Jonathan Gray - assumed Blackstone executive; title unverified
- False negative: grade D / NEEDS MORE INFO.
- linkedin-fetch=INCONCLUSIVE: Searched: https://www.linkedin.com/company/blackstone/. Found: the public LinkedIn page Name: no. Company: yes. City: yes. Confidence: medium.
- screen-x=UNAVAILABLE: Searched: "Jonathan Gray" blackstone on X. The company website links https://twitter.com/blackstone, and X blocked automated access. Couldn't check f…
- screen-facebook=UNAVAILABLE: Searched: "Jonathan Gray" blackstone on Facebook. The company website links https://www.facebook.com/blackstone, and Facebook blocked automated acces…
- screen-instagram=UNAVAILABLE: Searched: Blackstone on Instagram. The company website links https://www.instagram.com/blackstone/, and Instagram blocked automated access. Couldn't …
- screen-youtube=INCONCLUSIVE: Searched: "Jonathan Gray" blackstone on YouTube. Found: Where’s the Beef? Blackstone's Jon Gray on the Payoff From the Enormous AI CapEx Spend / Sept…
- screen-tiktok=INCONCLUSIVE: Searched: Jonathan Gray Blackstone on TikTok. No result found that names this person and this company. Name: no. Company: no. City: no. Confidence: n…
- news=FAIL: Negative coverage names this person or company with the company or city in the same headline. Possible match, needs review. This is not an automatic …
- FLAG news=FAIL review: Negative coverage names this person or company with the company or city in the same headline. Possible match, needs review. This is not an automatic …
- Caps applied: Capped at D: a doubtful hit needs a human to verify it

### R03 - Related Companies / Stephen Ross
- Ground truth to be confirmed by Richard: Stephen Ross - assumed Related founder; title unverified

### R04 - Tishman Speyer / Rob Speyer
- Ground truth to be confirmed by Richard: Rob Speyer - assumed Tishman Speyer executive; title unverified

### R05 - Hines / Jeff Hines
- Ground truth to be confirmed by Richard: Jeff Hines - assumed Hines executive; title unverified
- False negative: grade D / NEEDS MORE INFO.
- website=UNAVAILABLE: Searched: https://www.hines.com. The company website did not respond. Couldn't check for free.
- screen-x=UNAVAILABLE: Searched: "Jeff Hines" hines on X. X blocked automated access. Couldn't check for free.
- screen-facebook=UNAVAILABLE: Searched: "Jeff Hines" hines on Facebook. Facebook blocked automated access. Couldn't check for free.
- screen-instagram=UNAVAILABLE: Searched: Hines on Instagram. Instagram blocked automated access. Couldn't check for free.
- screen-tiktok=INCONCLUSIVE: Searched: Jeff Hines Hines on TikTok. No result found that names this person and this company. Name: no. Company: no. City: no. Confidence: none.
- edgar=INCONCLUSIVE: EDGAR responded. No company on the SEC list uses this firm's name.
- news=FAIL: Negative coverage names this person or company with the company or city in the same headline. Possible match, needs review. This is not an automatic …
- FLAG news=FAIL review: Negative coverage names this person or company with the company or city in the same headline. Possible match, needs review. This is not an automatic …
- Caps applied: Capped at D: a doubtful hit needs a human to verify it

### R06 - Silverstein Properties / Larry Silverstein
- Ground truth to be confirmed by Richard: Larry Silverstein - assumed Silverstein Properties founder; title unverified

### R07 - Veris Residential (company only)
- Ground truth to be confirmed by Richard: Mahbod Nia - assumed Veris Residential executive; chosen by bench author, unverified

### R08 - Hovnanian Enterprises / Ara Hovnanian
- Ground truth to be confirmed by Richard: Ara Hovnanian - assumed Hovnanian Enterprises executive; title unverified. hovnanian.com does not resolve from the box, so the corporate site khov.com is used.

### R09 - Toll Brothers (company only)
- Ground truth to be confirmed by Richard: Douglas Yearley - assumed Toll Brothers executive; chosen by bench author, unverified
- False negative: grade F / NEEDS MORE INFO.
- website=INCONCLUSIVE: Searched: https://www.tollbrothers.com. Found: a page on the company site Name: no. Company: yes. City: no. Confidence: low.
- linkedin-fetch=INCONCLUSIVE: Searched: https://www.linkedin.com/company/toll-brothers/. No result found that names this person and this company. Name: no. Company: no. City: yes.…
- screen-x=UNAVAILABLE: Searched: "Douglas Yearley" brothers on X. The company website links https://x.com/tollbrothers, and X blocked automated access. Couldn't check for f…
- screen-facebook=UNAVAILABLE: Searched: "Douglas Yearley" brothers on Facebook. The company website links https://www.facebook.com/tollbrothers/, and Facebook blocked automated ac…
- screen-instagram=UNAVAILABLE: Searched: Toll Brothers on Instagram. The company website links https://www.instagram.com/tollbrothers/, and Instagram blocked automated access. Coul…
- screen-tiktok=INCONCLUSIVE: Searched: Douglas Yearley Toll Brothers on TikTok. No result found that names this person and this company. Name: no. Company: no. City: no. Confiden…
- screen-news=INCONCLUSIVE: Searched: "Douglas Yearley" brothers / "Yearley" "brothers". No result found that names this person and this company. Name: no. Company: no. City: no…
- screen-web=INCONCLUSIVE: Searched: "Douglas Yearley" "Toll Brothers" "Fort Washington". No result found that names this person and this company. Name: no. Company: no. City: …
- edgar=INCONCLUSIVE: EDGAR responded. No company on the SEC list uses this firm's name.
- news=INCONCLUSIVE: A headline names the person or the company, without a negative term tying them together. Google News, Bing News responded. Unavailable: GDELT.

### R10 - Greystar (company only)
- Ground truth to be confirmed by Richard: Bob Faith - assumed Greystar founder; chosen by bench author, unverified
- False negative: grade D / NEEDS MORE INFO.
- website=INCONCLUSIVE: Searched: https://www.greystar.com. Found: a page on the company site Name: no. Company: yes. City: no. Confidence: low.
- screen-x=UNAVAILABLE: Searched: "Bob Faith" greystar on X. The company website links https://x.com/GreystarApts, and X blocked automated access. Couldn't check for free.
- screen-facebook=UNAVAILABLE: Searched: "Bob Faith" greystar on Facebook. Facebook blocked automated access. Couldn't check for free.
- screen-instagram=UNAVAILABLE: Searched: Greystar on Instagram. The company website links https://www.instagram.com/greystarapartments, and Instagram blocked automated access. Coul…
- screen-tiktok=INCONCLUSIVE: Searched: Bob Faith Greystar on TikTok. No result found that names this person and this company. Name: no. Company: no. City: no. Confidence: none.
- screen-news=INCONCLUSIVE: Searched: "Bob Faith" greystar / "Faith" "greystar". No result found that names this person and this company. Name: no. Company: no. City: no. Confid…
- edgar=INCONCLUSIVE: EDGAR responded. No company on the SEC list uses this firm's name.
- news=FAIL: Negative coverage names this person or company with the company or city in the same headline. Possible match, needs review. This is not an automatic …
- FLAG news=FAIL review: Negative coverage names this person or company with the company or city in the same headline. Possible match, needs review. This is not an automatic …
- Caps applied: Capped at D: a doubtful hit needs a human to verify it

### F01 - Control 1: invented firm, Gmail, no site
- Corroborating PASS on a fake: screen-youtube: Searched: "Jane Roe" zorblax on YouTube. Found: Jane Roe Name: yes. Company: no. City: yes. Confidence: medium.

### F02 - Control 2: invented firm, mailinator, no site/LinkedIn
- Caps applied: Capped at F: The email domain is disposable (Bundled disposable-domain list).

### F03a - Control 3a: impersonation - Gmail + 'Prologis' + made-up person, no site
- Corroborating PASS on a fake: screen-youtube: Searched: "Tobias Wrenfield" prologis on YouTube. Found: This emotional Navy SEAL and German Shepherd story follows Tobias Wrenfield, a former Navy S…
- Corroborating PASS on a fake: web-footprint: Searched: "Tobias Wrenfield" prologis on YouTube. Found: This emotional Navy SEAL and German Shepherd story follows Tobias Wrenfield, a former Navy S…
- Corroborating PASS on a fake: edgar: EDGAR lists Prologis, Inc. (PLD). Confirm it is the same firm.

### F03b - Control 3b: impersonation - made-up person + 'Prologis' + the REAL prologis.com site and company LinkedIn
- Corroborating PASS on a fake: edgar: EDGAR lists Prologis, Inc. (PLD). Confirm it is the same firm.

### F04 - Control 4: invented firm with self-hosted page naming the person
- Self-hosted fixture page at http://127.0.0.1:46471/F04/
- Corroborating PASS on a fake: website: Searched: http://127.0.0.1:46471/F04/. Found: a page on the company site Name: yes. Company: yes. City: no. Confidence: high.
- Corroborating PASS on a fake: web-footprint: Searched: "Marisol Quentin-Vale" "Quillfeather Ridge Holdings LLC" "New York". Found: a public page names this person and this company Name: yes. Com…

### F05 - Control 5: fraud text with invented firm
- Caps applied: Capped at F: The write-up matches a fraud pattern: guaranteed returns together with a request to send funds (Local text heuristic).

### F06a - Control 6a: real OFAC SDN individual + location matching the list (full OFAC cache)
- SDN individual ent#15888 "LOGUNOV, Oleg" pulled from downloaded sdn.csv (remarks: DOB 04 Feb 1962; POB Irkutsk Region, Russia.)
- Corroborating PASS on a fake: screen-youtube: Searched: "Oleg Logunov" northbridge on YouTube. Found: YouTube returned a public result Name: yes. Company: no. City: yes. Confidence: medium.
- Caps applied: Capped at F: A sanctions list name matches, and the location or date of birth on the application lines up with the list entry (OFAC cache plus Private Floor test overlay). Confirm the entry before you decide.

### F06b - Control 6b: same SDN individual, US location (name-only match, uncorroborated)
- SDN individual ent#15888 "LOGUNOV, Oleg" pulled from downloaded sdn.csv (remarks: DOB 04 Feb 1962; POB Irkutsk Region, Russia.)

### F06c - Control 6c: BUG PROBE - same as F01 but with an EMPTY watchlist cache; sanctions must be NOT_RUN, not PASS
- Sanctions expected NOT_RUN, got PASS - BUG: sanctions PASSES with no list loaded (TEST_WATCHLIST overlay makes lists.length > 0).

### F07a - Control 7a: real exec (Stephen Ross) paired with a different real company (Greystar), no site
- Corroborating PASS on a fake: screen-youtube: Searched: "Stephen Ross" greystar on YouTube. Found: 'Etched In Glass: The Legacy of Steve Ross' — The Row at Franklin (with Audio Descriptions) / Fr…
- Corroborating PASS on a fake: web-footprint: Searched: "Stephen Ross" greystar on YouTube. Found: 'Etched In Glass: The Legacy of Steve Ross' — The Row at Franklin (with Audio Descriptions) / Fr…

### F07b - Control 7b: real exec (Larry Silverstein) paired with Toll Brothers + Toll Brothers' real site
- Corroborating PASS on a fake: screen-youtube: Searched: "Larry Silverstein" brothers on YouTube. Found: The Man Who Built New York City With No Money / Larry Silverstein Name: yes. Company: no. C…

### F08b - Hard fake 8b: copycat spelling of Toll Brothers with self-hosted page naming the person
- Self-hosted fixture page at http://127.0.0.1:46471/F08b/

## Source health (preflight)

| Source | HTTP | ms |
|---|---|---|
| CourtListener v4 | 200 | 324 |
| SEC company_tickers | 200 | 63 |
| SEC efts (URL as used by edgar.ts) | 200 | 273 |
| DuckDuckGo html | 202 | 114 |
| Bing web | 200 | 94 |
| Google News RSS | 200 | 791 |
| GDELT doc API | 0 | 10491 |
| OFAC sdn.csv (HEAD) | 200 | 10735 |
| rdap.org | 200 | 242 |
| OpenSanctions API (expected 401) | 401 | 228 |
| OpenCorporates API (expected 401) | 401 | 450 |
| DNS MX gmail.com (error ENODATA) | 0 | 4 |

UNAVAILABLE counts per check across 23 cases: mx=22, website=13, screen-x=23, screen-facebook=23, screen-instagram=23, opencorporates=23, opensanctions=23, screen-web=17, linkedin-fetch=11, web-footprint=10, courts=2.
