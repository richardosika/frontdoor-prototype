# Verification benchmark - after-batch2

Rubric 2026-10-25. Run started 10/26/2026, 12:43:08 PM (America/New_York). Network ON, free sources only.

> GROUND TRUTH TO BE CONFIRMED BY RICHARD. Person-to-company links and titles for REAL cases are the benchmark author's public-knowledge assumptions. They are NOT verified and the harness never asserts a current job title. Cases marked companyOnly only expect company corroboration.

OFAC: sdn.csv from <24h cache; alt.csv from <24h cache; 39614 watchlist entries parsed (same parser as the app's refreshWatchlist)

## Results

| Case | Kind | Case label | Expected | Grade | Score | Conf | Recommendation | Legacy | Cov all / net | Result |
|---|---|---|---|---|---|---|---|---|---|---|
| R01 | real (company only) | Prologis (company only) | not F/DECLINE; company-only corroboration | C | 73 | Medium | APPROVE WITH CONDITIONS | 71 NEEDS_OWNER_DECISION | 63.5% / 57.1% | **PASS** |
| R02 | real | Blackstone / Jonathan Gray | not F/DECLINE; company corroborated where public | D | 65 | Medium | NEEDS MORE INFO | 59 NEEDS_OWNER_DECISION | 55.9% / 42.6% | **PASS** FN |
| R03 | real | Related Companies / Stephen Ross | not F/DECLINE; company corroborated where public | C | 75 | Medium | APPROVE WITH CONDITIONS | 58 NEEDS_OWNER_DECISION | 55.2% / 42% | **PASS** |
| R04 | real | Tishman Speyer / Rob Speyer | not F/DECLINE; company corroborated where public | C | 71 | Medium | APPROVE WITH CONDITIONS | 62 NEEDS_OWNER_DECISION | 59.2% / 50% | **PASS** |
| R05 | real | Hines / Jeff Hines | not F/DECLINE; company corroborated where public | D | 63 | Medium | NEEDS MORE INFO | 55 NEEDS_OWNER_DECISION | 49.7% / 32.7% | **PASS** FN |
| R06 | real | Silverstein Properties / Larry Silverstein | not F/DECLINE; company corroborated where public | C | 79 | Medium | APPROVE WITH CONDITIONS | 62 NEEDS_OWNER_DECISION | 58.2% / 46.8% | **PASS** |
| R07 | real (company only) | Veris Residential (company only) | not F/DECLINE; company-only corroboration | B | 81 | Medium | APPROVE WITH CONDITIONS | 69 NEEDS_OWNER_DECISION | 61.8% / 53.3% | **PASS** |
| R08 | real | Hovnanian Enterprises / Ara Hovnanian | not F/DECLINE; company corroborated where public | B | 81 | Medium | APPROVE WITH CONDITIONS | 69 NEEDS_OWNER_DECISION | 61.8% / 53.3% | **PASS** |
| R09 | real (company only) | Toll Brothers (company only) | not F/DECLINE; company-only corroboration | B | 81 | Medium | APPROVE WITH CONDITIONS | 73 LEGIT | 65.7% / 61.2% | **PASS** |
| R10 | real (company only) | Greystar (company only) | not F/DECLINE; company-only corroboration | C | 71 | Medium | APPROVE WITH CONDITIONS | 57 NEEDS_OWNER_DECISION | 51.9% / 36.5% | **PASS** |
| F01 | fake | Control 1: invented firm, Gmail, no site | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 44 | Low | NEEDS MORE INFO | 39 NEEDS_OWNER_DECISION | 35.7% / 6.8% | **PASS** |
| F02 | fake | Control 2: invented firm, mailinator, no site/LinkedIn | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 40 | Low | DECLINE | 31 NOT_LEGIT | 38% / 0% | **PASS** |
| F03a | fake | Control 3a: impersonation - Gmail + 'Prologis' + made-up person, no s… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 58 | Medium | NEEDS MORE INFO | 60 NEEDS_OWNER_DECISION | 52.6% / 40% | **PASS** |
| F03b | fake | Control 3b: impersonation - made-up person + 'Prologis' + the REAL pr… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | D | 65 | Medium | NEEDS MORE INFO | 62 NEEDS_OWNER_DECISION | 55.9% / 42.6% | **PASS** |
| F04 | fake | Control 4: invented firm with self-hosted page naming the person | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | D | 62 | Low | NEEDS MORE INFO | 45 NEEDS_OWNER_DECISION | 42% / 18.6% | **PASS** |
| F04b | fake | Control 4b (padded): F04 plus format-valid LinkedIn, matching-area-co… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | D | 67 | Low | NEEDS MORE INFO | 51 NEEDS_OWNER_DECISION | 47.9% / 18.6% | **PASS** |
| F05 | fake | Control 5: fraud text with invented firm | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 40 | Low | DECLINE | 37 NOT_LEGIT | 41% / 9.8% | **PASS** |
| F06a | fake | Control 6a: real OFAC SDN individual + location matching the list (fu… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 36 | Low | DECLINE | 35 NOT_LEGIT | 41.7% / 9.8% | **PASS** |
| F06b | fake | Control 6b: same SDN individual, US location (name-only match, uncorr… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 36 | Low | NEEDS MORE INFO | 33 NEEDS_OWNER_DECISION | 41.7% / 9.8% | **PASS** |
| F06c | fake | Control 6c: BUG PROBE - same as F01 but with an EMPTY watchlist cache… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 36 | Low | NEEDS MORE INFO | 35 NEEDS_OWNER_DECISION | 29.8% / 6.8% | **PASS** |
| F07a | fake | Control 7a: real exec (Stephen Ross) paired with a different real com… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 52 | Medium | NEEDS MORE INFO | 47 NEEDS_OWNER_DECISION | 43% / 22.9% | **PASS** |
| F07b | fake | Control 7b: real exec (Larry Silverstein) paired with Toll Brothers +… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | D | 62 | Low | NEEDS MORE INFO | 52 NEEDS_OWNER_DECISION | 49.1% / 32.6% | **PASS** |
| F08a | fake | Hard fake 8a: copycat spelling of Blackstone, made-up person, no site | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | F | 44 | Low | NEEDS MORE INFO | 42 NEEDS_OWNER_DECISION | 38.2% / 9.8% | **PASS** |
| F08b | fake | Hard fake 8b: copycat spelling of Toll Brothers with self-hosted page… | F/D and NEEDS MORE INFO/DECLINE, never APPROVE* | D | 62 | Low | NEEDS MORE INFO | 47 NEEDS_OWNER_DECISION | 42% / 18.6% | **PASS** |
| R11 | real (company only) | CBRE Group / Bob Sulentic (company only) | not F/DECLINE; company-only corroboration | C | 73 | Medium | APPROVE WITH CONDITIONS | 67 NEEDS_OWNER_DECISION | 60.4% / 51.9% | **PASS** |
| R12 | real (company only) | Madison Realty Capital / Josh Zegen (company only) | not F/DECLINE; company-only corroboration | C | 71 | Medium | APPROVE WITH CONDITIONS | 60 NEEDS_OWNER_DECISION | 56.9% / 44.9% | **PASS** |
| R13 | real (company only) | Cole Schotz / Richard Abramson (company only) | not F/DECLINE; company-only corroboration | D | 64 | Low | NEEDS MORE INFO | 49 NEEDS_OWNER_DECISION | 44% / 19.6% | **PASS** FN |
| R14 | real (company only) | Parke Bancorp / Vito Pantilione (company only) | not F/DECLINE; company-only corroboration | B | 81 | Medium | NEEDS MORE INFO | 62 NEEDS_OWNER_DECISION | 55.4% / 41.3% | **PASS** |

## Counts

- Cases: 28; PASS 28, FAIL 0, ERROR 0.
- False positives (fake reaching APPROVE* or grade >= C): **0** 
- False negatives (real entity graded D/F or DECLINE): **3** (R02, R05, R13)

## Per-check status matrix

P=PASS F=FAIL I=INCONCLUSIVE U=UNAVAILABLE N=NOT_RUN, blank = check not emitted. Weights in the key column are the PASS-time weights seen first.

| Check (weight) | R01 | R02 | R03 | R04 | R05 | R06 | R07 | R08 | R09 | R10 | F01 | F02 | F03a | F03b | F04 | F04b | F05 | F06a | F06b | F06c | F07a | F07b | F08a | F08b | R11 | R12 | R13 | R14 |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| email-syntax (5) | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| email-provider (2) | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| disposable-email (8) | P | P | P | P | P | P | P | P | P | P | P | F! | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| role-address (4) | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| phone-state (4) | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | P | I | I | I | I | I | I | I | I | I | I | I | I |
| text-risk (4) | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | F! | P | P | P | P | P | P | P | P | P | P | P |
| duplicate (8) | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| sanctions (10) | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | F! | F | N | P | P | P | P | P | P | P | P |
| linkedin-format (4) | P | P | P | P | P | P | P | P | P | P | I | I | I | P | I | P | I | I | I | I | I | I | I | I | P | P | P | P |
| business-card (10) | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N |
| invite-source (6) | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| plausibility (4) | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| velocity (4) | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| social-links (2) | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | P | I | I | I | I | I | I | I | I | I | I | I | I |
| business-registry (8) | N | I | I | I | N | I | N | N | N | N | I | I | N | N | I | I | I | N | U | I | U | U | I | N | N | I | N | N |
| mx (6) | P | P | P | P | P | P | P | P | P | P | P | N | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| rdap (4) | P | P | P | P | P | P | P | P | P | P |  |  |  | P | I | I |  |  |  |  |  | P |  | I | P | P | P | P |
| website (4) | U | U | P | U | U | P | P | P | P | P | N | N | N | U | P | P | N | N | N | N | N | P | N | P | U | P | P | P |
| linkedin-fetch (4) | I | I | I | P* | P* | P* | I | I | I | P* | U | U | U | I | U | U | U | U | U | U | U | I | U | U | I | P* | I | U |
| screen-x (4) | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U |
| screen-facebook (4) | U | U | U | U | U | I | U | I | I | U | U | U | U | U | U | U | U | U | U | U | U | I | U | U | U | I | I | U |
| screen-instagram (4) | I | U | U | U | I | U | U | U | U | I | I | U | I | I | U | U | U | U | U | I | U | U | U | U | I | U | U | U |
| screen-youtube (8) | P* | I | P* | P* | P* | P* | P* | P* | P* | P* | I | I | P* | P* | I | I | I | I | I | I | P* | I | I | I | P* | P* | I | I |
| screen-tiktok (4) | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I |
| screen-news (8) | P* | P* | P* | P* | I | I | I | I | P* | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | P* | P* | I | I |
| screen-web (4) | U | U | U | P | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U |
| web-footprint (8) | P* | P* | P | P* | P* | P | P | P | P* | P* | U | U | P* | P* | P | P | U | U | U | U | P* | U | U | P | P* | P | P | P |
| edgar (12) | P | P | I | I | I | I | P* | P | P* | I | I | I | P | P | I | I | I | I | I | I | I | P | I | I | P | I | I | P |
| courts (2) | P | P | I | U | I | P | P | P | P | I | I | U | P | P | P | P | P | P | P | I | I | P | P | P | U | P | U | U |
| opencorporates (6) | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U |
| opensanctions (8) | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U | U |
| news (8) | P* | I | P* | P* | I | P* | P* | P* | P* | I | I | I | I | I | I | I | I | I | I | I | I | I | I | I | P* | I | I | P* |

`*` = corroborates=true, `!` = hard flag.

## Reasons and notes

### R01 - Prologis (company only)
- Ground truth to be confirmed by Richard: Hamid Moghadam - assumed Prologis co-founder/executive; unverified

### R02 - Blackstone / Jonathan Gray
- Ground truth to be confirmed by Richard: Jonathan Gray - assumed Blackstone executive; title unverified
- False negative: grade D / NEEDS MORE INFO.
- website=UNAVAILABLE: Searched: https://www.blackstone.com. The company website did not respond. Couldn't check for free. Not checkable for free.
- linkedin-fetch=INCONCLUSIVE: Searched: https://www.linkedin.com/company/blackstone/. Found: the public LinkedIn page Name: no. Company: yes. City: yes. Confidence: medium.
- screen-x=UNAVAILABLE: Searched: "Jonathan Gray" blackstone on X. X blocked automated access. Couldn't check for free. Not checkable for free.
- screen-facebook=UNAVAILABLE: Searched: "Jonathan Gray" blackstone on Facebook. Facebook blocked automated access. Couldn't check for free. Not checkable for free.
- screen-instagram=UNAVAILABLE: Searched: Blackstone on Instagram. Instagram blocked automated access. Couldn't check for free. Not checkable for free.
- screen-youtube=INCONCLUSIVE: Searched: "Jonathan Gray" blackstone on YouTube. Found: Where’s the Beef? Blackstone's Jon Gray on the Payoff From the Enormous AI CapEx Spend / Sept…
- screen-tiktok=INCONCLUSIVE: Searched: Jonathan Gray Blackstone on TikTok. No result found that names this person and this company. Name: no. Company: no. City: no. Confidence: n…
- screen-web=UNAVAILABLE: Searched: "Jonathan Gray" "Blackstone" "New York". DuckDuckGo and Bing did not return a usable results page from this network. Couldn't check for fre…
- news=INCONCLUSIVE: Company-level litigation headline. A lawsuit or similar civil term names the company. This is an attention item for Richard, not an automatic review …

### R03 - Related Companies / Stephen Ross
- Ground truth to be confirmed by Richard: Stephen Ross - assumed Related founder; title unverified

### R04 - Tishman Speyer / Rob Speyer
- Ground truth to be confirmed by Richard: Rob Speyer - assumed Tishman Speyer executive; title unverified

### R05 - Hines / Jeff Hines
- Ground truth to be confirmed by Richard: Jeff Hines - assumed Hines executive; title unverified
- False negative: grade D / NEEDS MORE INFO.
- website=UNAVAILABLE: Searched: https://www.hines.com. The company website did not respond. Couldn't check for free. Not checkable for free.
- screen-x=UNAVAILABLE: Searched: "Jeff Hines" hines on X. X blocked automated access. Couldn't check for free. Not checkable for free.
- screen-facebook=UNAVAILABLE: Searched: "Jeff Hines" hines on Facebook. Facebook blocked automated access. Couldn't check for free. Not checkable for free.
- screen-instagram=INCONCLUSIVE: Searched: Hines on Instagram. Found: Hines • 151K reels on Instagram {"require":[["ScheduledServerJS","handle",null,[{"__bbox":{"define":[["cr:310",[…
- screen-tiktok=INCONCLUSIVE: Searched: Jeff Hines Hines on TikTok. No result found that names this person and this company. Name: no. Company: no. City: no. Confidence: none.
- screen-news=INCONCLUSIVE: Searched: "Jeff Hines" hines / "Hines" "hines". No result found that names this person and this company. Name: no. Company: no. City: no. Confidence:…
- screen-web=UNAVAILABLE: Searched: "Jeff Hines" "Hines" "Houston". DuckDuckGo and Bing did not return a usable results page from this network. Couldn't check for free. Not ch…
- edgar=INCONCLUSIVE: EDGAR responded. No company on the SEC list uses this firm's name.
- news=INCONCLUSIVE: A headline names the person or the company, without a negative term tying them together. Google News, Bing News responded. Unavailable: GDELT.

### R06 - Silverstein Properties / Larry Silverstein
- Ground truth to be confirmed by Richard: Larry Silverstein - assumed Silverstein Properties founder; title unverified

### R07 - Veris Residential (company only)
- Ground truth to be confirmed by Richard: Mahbod Nia - assumed Veris Residential executive; chosen by bench author, unverified

### R08 - Hovnanian Enterprises / Ara Hovnanian
- Ground truth to be confirmed by Richard: Ara Hovnanian - assumed Hovnanian Enterprises executive; title unverified. hovnanian.com does not resolve from the box, so the corporate site khov.com is used.

### R09 - Toll Brothers (company only)
- Ground truth to be confirmed by Richard: Douglas Yearley - assumed Toll Brothers executive; chosen by bench author, unverified

### R10 - Greystar (company only)
- Ground truth to be confirmed by Richard: Bob Faith - assumed Greystar founder; chosen by bench author, unverified

### F02 - Control 2: invented firm, mailinator, no site/LinkedIn
- Caps applied: Capped at F: The email domain is disposable (Bundled disposable-domain list).

### F03a - Control 3a: impersonation - Gmail + 'Prologis' + made-up person, no site
- Corroborating PASS on a fake: screen-youtube: Searched: "Tobias Wrenfield" prologis on YouTube. Found: This emotional Navy SEAL and German Shepherd story follows Tobias Wrenfield, a former Navy S…
- Corroborating PASS on a fake: web-footprint: Searched: "Tobias Wrenfield" prologis on YouTube. Found: This emotional Navy SEAL and German Shepherd story follows Tobias Wrenfield, a former Navy S…

### F03b - Control 3b: impersonation - made-up person + 'Prologis' + the REAL prologis.com site and company LinkedIn
- Corroborating PASS on a fake: screen-youtube: Searched: "Tobias Wrenfield" prologis on YouTube. Found: This emotional Navy SEAL and German Shepherd story follows Tobias Wrenfield, a former Navy S…
- Corroborating PASS on a fake: web-footprint: Searched: "Tobias Wrenfield" prologis on YouTube. Found: This emotional Navy SEAL and German Shepherd story follows Tobias Wrenfield, a former Navy S…

### F04 - Control 4: invented firm with self-hosted page naming the person
- Self-hosted fixture page at http://127.0.0.1:41949/F04/
- Caps applied: Capped at D: no free source corroborated the person and the company

### F04b - Control 4b (padded): F04 plus format-valid LinkedIn, matching-area-code phone, and a social URL - tests how close a cosmetic fake gets to grade C
- Self-hosted fixture page at http://127.0.0.1:41949/F04b/
- Caps applied: Capped at D: no free source corroborated the person and the company

### F05 - Control 5: fraud text with invented firm
- Caps applied: Capped at F: The write-up matches a fraud pattern: guaranteed returns together with a request to send funds (Local text heuristic).

### F06a - Control 6a: real OFAC SDN individual + location matching the list (full OFAC cache)
- SDN individual ent#15888 "LOGUNOV, Oleg" pulled from downloaded sdn.csv (remarks: DOB 04 Feb 1962; POB Irkutsk Region, Russia.)
- Caps applied: Capped at F: A sanctions list name matches, and the location or date of birth on the application lines up with the list entry (OFAC SDN cache). Confirm the entry before you decide.

### F06b - Control 6b: same SDN individual, US location (name-only match, uncorroborated)
- SDN individual ent#15888 "LOGUNOV, Oleg" pulled from downloaded sdn.csv (remarks: DOB 04 Feb 1962; POB Irkutsk Region, Russia.)

### F07a - Control 7a: real exec (Stephen Ross) paired with a different real company (Greystar), no site
- Corroborating PASS on a fake: screen-youtube: Searched: "Stephen Ross" greystar on YouTube. Found: Leo Schofield introduces New York Cabaret legend Steve Ross, who is appearing at Sydney Opera Ho…
- Corroborating PASS on a fake: web-footprint: Searched: "Stephen Ross" greystar on YouTube. Found: Leo Schofield introduces New York Cabaret legend Steve Ross, who is appearing at Sydney Opera Ho…

### F07b - Control 7b: real exec (Larry Silverstein) paired with Toll Brothers + Toll Brothers' real site
- Caps applied: Capped at D: no free source corroborated the person and the company

### F08b - Hard fake 8b: copycat spelling of Toll Brothers with self-hosted page naming the person
- Self-hosted fixture page at http://127.0.0.1:41949/F08b/
- Caps applied: Capped at D: no free source corroborated the person and the company

### R11 - CBRE Group / Bob Sulentic (company only)
- Ground truth to be confirmed by Richard: Bob Sulentic is assumed to be associated with CBRE Group. The person link is unverified.

### R12 - Madison Realty Capital / Josh Zegen (company only)
- Ground truth to be confirmed by Richard: Josh Zegen is assumed to be associated with Madison Realty Capital. The person link is unverified.

### R13 - Cole Schotz / Richard Abramson (company only)
- Ground truth to be confirmed by Richard: Richard Abramson is assumed to be associated with Cole Schotz. The person link is unverified.
- MISS: no company-evidence check returned PASS with corroborates=true.
- False negative: grade D / NEEDS MORE INFO.
- linkedin-fetch=INCONCLUSIVE: Searched: https://www.linkedin.com/company/cole-schotz-pc/. No result found that names this person and this company. Name: no. Company: no. City: no.…
- screen-x=UNAVAILABLE: Searched: "Richard Abramson" cole on X. The company website links https://x.com/coleschotz, and X blocked automated access. Couldn't check for free. …
- screen-facebook=INCONCLUSIVE: Searched: "Richard Abramson" cole on Facebook. Found: Cole Schotz P.C. / Hackensack NJ {"require":[["ScheduledServerJS","handle",null,[{"__bbox":{"de…
- screen-instagram=UNAVAILABLE: Searched: Cole Schotz on Instagram. The company website links https://www.instagram.com/cole_schotz_pc, and Instagram blocked automated access. Could…
- screen-youtube=INCONCLUSIVE: Searched: "Richard Abramson" cole on YouTube. No result found that names this person and this company. Name: no. Company: no. City: no. Confidence: n…
- screen-tiktok=INCONCLUSIVE: Searched: Richard Abramson Cole Schotz on TikTok. No result found that names this person and this company. Name: no. Company: no. City: no. Confidenc…
- screen-news=INCONCLUSIVE: Searched: "Richard Abramson" cole / "Abramson" "cole". No result found that names this person and this company. Name: no. Company: no. City: no. Conf…
- screen-web=UNAVAILABLE: Searched: "Richard Abramson" "Cole Schotz" "Hackensack". DuckDuckGo and Bing did not return a usable results page from this network. Couldn't check f…
- edgar=INCONCLUSIVE: EDGAR responded. No company on the SEC list uses this firm's name.
- news=INCONCLUSIVE: Company-level litigation headline. A lawsuit or similar civil term names the company. This is an attention item for Richard, not an automatic review …
- Caps applied: Capped at D: no free source corroborated the person and the company

### R14 - Parke Bancorp / Vito Pantilione (company only)
- Ground truth to be confirmed by Richard: Vito Pantilione is assumed to be associated with Parke Bancorp. The person link is unverified.

## Source health (preflight)

| Source | HTTP | ms |
|---|---|---|
| CourtListener v4 | 200 | 2158 |
| SEC company_tickers | 200 | 181 |
| SEC efts (URL as used by edgar.ts) | 200 | 643 |
| DuckDuckGo html | 0 | 10492 |
| Bing web | 200 | 86 |
| Google News RSS | 200 | 572 |
| GDELT doc API | 429 | 9794 |
| OFAC sdn.csv (HEAD) | 200 | 10723 |
| rdap.org | 200 | 288 |
| OpenSanctions API (expected 401) | 401 | 218 |
| OpenCorporates API (expected 401) | 401 | 251 |
| DNS MX gmail.com (ok) | 200 | 24 |

UNAVAILABLE counts per check across 28 cases: website=6, screen-x=28, screen-facebook=22, screen-web=27, opencorporates=28, opensanctions=28, screen-instagram=20, courts=5, linkedin-fetch=13, web-footprint=8, business-registry=3.

## Change vs after

| Case | Before | After | Result before -> after |
|---|---|---|---|
| R01 | C 73 APPROVE WITH CONDITIONS | C 73 APPROVE WITH CONDITIONS | PASS -> PASS |
| R02 | D 65 NEEDS MORE INFO | D 65 NEEDS MORE INFO | PASS -> PASS |
| R03 | C 75 APPROVE WITH CONDITIONS | C 75 APPROVE WITH CONDITIONS | PASS -> PASS |
| R04 | C 77 APPROVE WITH CONDITIONS | C 71 APPROVE WITH CONDITIONS | PASS -> PASS |
| R05 | D 63 NEEDS MORE INFO | D 63 NEEDS MORE INFO | PASS -> PASS |
| R06 | C 79 APPROVE WITH CONDITIONS | C 79 APPROVE WITH CONDITIONS | PASS -> PASS |
| R07 | B 81 APPROVE WITH CONDITIONS | B 81 APPROVE WITH CONDITIONS | PASS -> PASS |
| R08 | B 81 APPROVE WITH CONDITIONS | B 81 APPROVE WITH CONDITIONS | PASS -> PASS |
| R09 | B 81 APPROVE WITH CONDITIONS | B 81 APPROVE WITH CONDITIONS | PASS -> PASS |
| R10 | C 71 APPROVE WITH CONDITIONS | C 71 APPROVE WITH CONDITIONS | PASS -> PASS |
| F01 | F 44 NEEDS MORE INFO | F 44 NEEDS MORE INFO | PASS -> PASS |
| F02 | F 40 DECLINE | F 40 DECLINE | PASS -> PASS |
| F03a | F 50 NEEDS MORE INFO | F 58 NEEDS MORE INFO | PASS -> PASS |
| F03b | F 54 NEEDS MORE INFO | D 65 NEEDS MORE INFO | PASS -> PASS |
| F04 | D 62 NEEDS MORE INFO | D 62 NEEDS MORE INFO | PASS -> PASS |
| F04b | D 67 NEEDS MORE INFO | D 67 NEEDS MORE INFO | PASS -> PASS |
| F05 | F 40 DECLINE | F 40 DECLINE | PASS -> PASS |
| F06a | F 36 DECLINE | F 36 DECLINE | PASS -> PASS |
| F06b | F 36 NEEDS MORE INFO | F 36 NEEDS MORE INFO | PASS -> PASS |
| F06c | F 36 NEEDS MORE INFO | F 36 NEEDS MORE INFO | PASS -> PASS |
| F07a | F 52 NEEDS MORE INFO | F 52 NEEDS MORE INFO | PASS -> PASS |
| F07b | D 62 NEEDS MORE INFO | D 62 NEEDS MORE INFO | PASS -> PASS |
| F08a | F 44 NEEDS MORE INFO | F 44 NEEDS MORE INFO | PASS -> PASS |
| F08b | D 62 NEEDS MORE INFO | D 62 NEEDS MORE INFO | PASS -> PASS |
| R11 | - | C 73 APPROVE WITH CONDITIONS | - -> PASS |
| R12 | - | C 71 APPROVE WITH CONDITIONS | - -> PASS |
| R13 | - | D 64 NEEDS MORE INFO | - -> PASS |
| R14 | - | B 81 NEEDS MORE INFO | - -> PASS |

### Per-check status flips vs after (network flakiness or live-data drift)

- R02: business-registry NOT_RUN->INCONCLUSIVE
- R03: business-registry NOT_RUN->INCONCLUSIVE
- R04: business-registry NOT_RUN->INCONCLUSIVE; edgar PASS->INCONCLUSIVE; courts PASS->UNAVAILABLE
- R06: business-registry NOT_RUN->INCONCLUSIVE
- R08: courts UNAVAILABLE->PASS
- R09: screen-instagram INCONCLUSIVE->UNAVAILABLE; courts UNAVAILABLE->PASS
- R10: screen-instagram UNAVAILABLE->INCONCLUSIVE
- F01: business-registry NOT_RUN->INCONCLUSIVE
- F02: business-registry NOT_RUN->INCONCLUSIVE; courts PASS->UNAVAILABLE
- F03a: screen-youtube INCONCLUSIVE->PASS; web-footprint UNAVAILABLE->PASS
- F03b: screen-youtube INCONCLUSIVE->PASS; web-footprint UNAVAILABLE->PASS
- F04: business-registry NOT_RUN->INCONCLUSIVE
- F04b: business-registry NOT_RUN->INCONCLUSIVE
- F05: business-registry NOT_RUN->INCONCLUSIVE
- F06b: business-registry NOT_RUN->UNAVAILABLE
- F06c: business-registry NOT_RUN->INCONCLUSIVE
- F07a: business-registry NOT_RUN->UNAVAILABLE; courts UNAVAILABLE->INCONCLUSIVE
- F07b: business-registry NOT_RUN->UNAVAILABLE; courts UNAVAILABLE->PASS
- F08a: business-registry NOT_RUN->INCONCLUSIVE
