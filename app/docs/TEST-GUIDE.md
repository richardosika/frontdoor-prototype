# Test guide

Use this on the deployed site or on a local server. Seeded members use the password `cornicio-demo`. Administrators sign in only at `/admin/login` (also linked as **Admin**, with a brass shield, from the home page, the member sign-in page, apply, and the legal pages). The administrator is Richard Osika, Founder, `rich@privatefloorclub.com`. The password is the server’s `ADMIN_PASSWORD`. It is not written in this guide. Marcus Hale (`marcus.hale@halerow.example`) is a demo member. A demo account cannot open the administrator pages.

When `ADMIN_PASSWORD` is set to at least 12 characters, the server replaces the administrator password with that value at startup. `cornicio-demo` works for members and does not sign in an administrator. A shorter value is ignored. If `ADMIN_PASSWORD` is unset, the administrator password is left as it already is.

The member sign-in page does not accept an administrator, and it uses the same generic error it uses for a wrong password. `/admin/login` does not accept a member, including a member password that is correct, and it uses that same generic error. After an administrator signs in, the next page is `/admin`. Open a private window when you want a member session and an administrator session at the same time.

Nothing on this test charges a card. Every email notice is stored in the Outbox. With `RESEND_API_KEY` unset, that is the only copy. When `RESEND_API_KEY` is set, the same notice is also emailed through Resend's HTTPS API, only to `rich@privatefloorclub.com` (or `NOTICE_TEST_RECIPIENT` if that env var is set). The subject starts with `[Test for <the applicant email>]`. The body starts with `Intended recipient:`. The HTML letter uses the forest header, a brass rule, and a brass button around that same plain-text letter. The wordmark is a PNG at `/email-assets/lockup.png`, which stays outside the site gate so mail clients can load it. The Outbox shows that layout above the plain text. Applicants are not emailed. `EMAIL_FROM` defaults to `Private Floor Club <onboarding@resend.dev>`. That free sender delivers only to the Resend account owner's inbox, which is the right test inbox. A failed send stays on the Outbox row and does not stop the application. `SHOW_TEST_CODE=1` shows the 4-digit apply code on screen even when `RESEND_API_KEY` is set. Any other value hides it once `RESEND_API_KEY`, `EMAIL_PROVIDER`, or `SMTP_URL` is set.

When `SITE_GATE_PASSWORD` is set, the browser asks for HTTP Basic username `privatefloor` and that password before any page, script, or API call. `/api/health`, `/api/stripe/webhook`, and `/email-assets/` do not ask. After the browser accepts the password, it sends that header again on same-origin requests, so `/login`, `/admin/login`, and the Auth.js calls from those pages keep working. When `SITE_GATE_PASSWORD` is unset, nothing asks for that password. Responses send `X-Robots-Tag: noindex, nofollow`, and `/robots.txt` disallows every path.

`CLEAN_TEST_DATA=dry` makes the next server start log a count for each table of testing rows and change nothing. `CLEAN_TEST_DATA=1` deletes those rows on startup, then logs the same counts. The log line never includes names, emails, or message text. Seeded members, seeded projects, templates, legal pages, settings, and the administrator password hash stay. Every invite code other than `PF-7K2M-91QX` is removed, and that demo code is set back to 0 of 40 uses. Unset the variable after that log line. Any other value is ignored. After that cleanup, the same email can request an invite and apply again: the earlier request, application, email code, Outbox notice, and non-seed member are gone. Use `PF-7K2M-91QX` on Apply. The email template letters stay.

The logo on forest backgrounds is a stand-in PF mark and reversed lockup. The approved files in `richardosika/private-floor-site` `tools/brand-src` were not readable from the build environment.

## Member side

1. Open `/`. The intro under the tagline does not mention a business card. **Request to join** is the filled button and the outline button beside **Sign in**. The filled button opens the form on this page. The outline button opens Apply. The request form sits in the brass-edged section directly under those buttons.
2. On that form, enter a first name, a last name, an email, a role, a company, a street, a city, a two-letter state, and a ZIP. Submit. The page says **Thank you for applying** and that a Private Floor administrator reviews every application and you will hear by email. It does not show a sign-in button or a status URL. In the admin Outbox, open the `invite_received` notice. It is signed Richard Osika, Founder, Private Floor Club, and it includes **Check your status** with `/invite-status/<token>`. That status page says **Application received**.
3. Open `/apply`. The header says the more detail you share, the better the match with members and deals. Step 1, **Invite code**. Enter `PF-7K2M-91QX`.
4. Step 2, **Choose role**. The monthly dues schedule is on the page: general contractors $199 per month, first month $99.50; brokers $199 per month, first month $99.50; attorneys and advisors $199 per month, first month $99.50. Membership is month to month, with no long-term contract, and you can cancel anytime. The first month is 50% off, then the full monthly price. The fee is due only after approval, flat, and never based on a deal. The role you pick repeats its own amount.
5. Step 3, **Your details**. Fill first name, last name, email, **Create password** (the hint **Minimum 8 characters** stays visible), company, contact phone, street, city, state, and ZIP. A shorter password shows **Password must be at least 8 characters** under the field. LinkedIn, website, social links, references, and the track-record note are optional. Upload a JPG or PNG business card and confirm the screen shows the file name, type, size, and a preview.
6. Still on step 3, **Confirm your email**. **Send code** stays off until first name, last name, email, a password of at least 8 characters, company, street, city, state, ZIP, and contact phone are valid. The box lists what is still missing, such as `Still needed: ZIP, contact phone`. A field highlights after you leave it empty, or if you change a valid value into an invalid one. When those fields are valid, send the code. While no email provider is configured, the page shows a **TEST MODE** line with the 4-digit code. With `RESEND_API_KEY` set, that line stays hidden unless `SHOW_TEST_CODE=1`, and the code is emailed only to the test recipient. The same code is in `/admin/outbox` on the `application_code` notice. The notice is addressed to the test recipient, not to the inbox you typed. If Resend fails, the Outbox row says **Email failed** and the application still continues. Enter the 4 digits and confirm, then continue. If a required field is cleared after **Email confirmed**, that confirmation stays and **Continue** stays on this step. The first invalid field is focused, and the line above **Continue** says **Please complete the highlighted fields**.
7. Step 4, **Before you submit**. A short intro, then a card for each point: How we review, A person decides, What you'll see, Not a consumer report, Optional items, Privacy, Dues, Electronic records, and Language. Dues is a table of the paid roles: general contractors, brokers, and attorneys, each first month $99.50 then $199 per month. The table does not list a free role. The note says month to month, no long-term contract, cancel anytime, first month 50% off, then the full monthly price, due only after approval, flat, and never based on a deal. Terms, Privacy, Disclosures, Verification Policy, Applicant consent, and Guidelines sit in one row. The two boxes are grouped under **Your agreement** and start unchecked. **Continue** stays disabled until both are checked. The sentences are the ones in `src/content/legal/applicant-consent.md`. Open each legal link. Each page shows **Draft - pending attorney review** and the version from the file’s `Version:` line.
8. Step 5, **Membership dues**. Confirm the first-month amount next to the full monthly price. The page says month to month, no long-term contract, cancel anytime, and that no card is collected on the form. English, Spanish, German, and Japanese schedules are on the page. Those schedules name the paid prices only. Both boxes are still required. **Submit application** is the full-width button. The helper under it is the sentence from the consent draft. Submit. There is no payment form on the application. The acceptance rows store the time and each document’s parsed version.
9. Open **View application status**. It should say **Application under review** and **Verification in progress**. It must not show a score or a source.
10. In the admin session, open the application, choose **Needs more info**, and write what you need. Reload the status page, reply with a note, and optionally upload a file. The status returns to in review.
11. Approve the application. A developer, investor, family office, or lender can sign in and open the floor. A general contractor, broker, or attorney is **Approved, payment due** and the sign-in stops on Pay dues until the test payment, a manual mark-paid, or a waiver. After the floor opens, the feed shows **Membership status** and a first-week checklist: profile, directory, community guidelines, a seeking or raising post, and an introduction. Directory and guidelines have **Mark done**. The other three complete when you save a profile, post, or request an introduction.
12. Sign in with a wrong password. The message stays generic. Sign in with the right password on an application that is still open. The message says the application is under review. On a declined application the message says it was not approved, with no reasons.

## Admin side

1. Open `/admin/login` from the **Admin** link, or go there directly. The title is **Private Floor administrator**. Sign in as `rich@privatefloorclub.com` with `ADMIN_PASSWORD`. `/admin` shows open applications, the Outbox count, and test applications. The signed-in nav keeps **Admin**, with the same brass shield. Signing in as Marcus Hale, or as any other demo member, on `/admin/login` stays on that page and shows **Those credentials were not recognized.** Signing in as the administrator on `/login` does the same.
2. `/admin/test`. Choose **Create sample applicants**. Six labelled TEST people appear:
   - Strong legit (offline fixtures, recommendation LEGIT)
   - Ambiguous (phone area code does not match the state)
   - Alexei Sanctionhit in Newark, company starting with TEST (recommendation NOT LEGIT). The person name is the fake watchlist name so the match is not diluted. The row is marked TEST.
   - Thin Gmail file
   - Disposable email with no site or LinkedIn
   - Duplicate of Marcus Hale
3. `/admin/applications`. The default filter is **Needs action** (open applications, including ones that already have a verdict). A request to join, before the full application exists, is listed under **Needs action** and **New**. It is not a verification file. Other filters: In review, Needs info, Recommended legit, Recommended not legit, Needs your decision, Approved, and Declined. Sort by submitted time and by score. Times are America/New_York. Select rows and **Delete selected**, or open a row and **Delete this applicant and all their data**. Both write an audit event. The list is the same for every administrator. It is not limited to the person who is signed in. **Hide demo** hides `.example` addresses and `is_test` rows. A real address stays visible.
4. Open a row. Read the applicant, the business card if one was uploaded, the automated report, the company report, and the evidence table. Save an internal note. **Re-run verification** calls the live free sources and can change a sample verdict. Approve, decline, or ask for more info. The decision log records who, when, and the note. A decline does not put that note on the member status page.
5. `/admin/outbox` lists every test notice.
6. `/admin/audit` lists decisions, verification runs, and moderation events.
7. `/admin/sources` lists sources, the OFAC cache time, and **Refresh watchlists now**.
8. `/admin/members` and a member’s page show legal acceptances after an approval (document, version, time, IP hash).
9. **Delete all test data** removes `is_test` applications and leftover `is_test` members, including a custom test applicant. It asks for confirmation. Seeded demo members that are not `is_test` stay.
10. **Create a test applicant** takes a name, company, email, and website, marks the row `is_test`, and queues a live verification run. Use it for a public company or a made-up name without going through `/apply`.

## After signup

Sign in as a member whose dues are not outstanding. Nothing here shows another member’s email or phone. Badges say **Verified** or **Verification in progress**. Wording says Private Floor administrator. A paying role that has not paid sees only the Pay dues page.

1. **Feed.** Complete the checklist. Post an update, a raising post, or a seeking post. Raising and seeking show the Seeking and Raising rules and require the acknowledgement box. A post that mentions IRR, a percent, accredited investors, a subscription, or similar language is held and does not appear for other members.
2. **Profile** (`/profile`). Edit markets, deal types, asset classes, check size or deal size, what you are looking for, what you offer, bio, website, and an optional business card.
3. **Network** (`/network`). Search and filter by role, state, deal type, and asset class. **Request introduction** sends a short note. The other member accepts or declines on Network. Accept opens a thread in Messages. Decline does not.
4. **Messages.** Reply in the thread. Block and report stay on the member profile and in the thread. Unread messages show on the Messages tab.
5. **Deals.** Search and filter, including any US state. Open a deal, read the Deal-Room NDA, and request access. The room lists document name, type, and size only. The sponsor can remove a participant. Close or edit your own post from the deal page.
6. **Alerts** and **Settings** (`/settings`). The bell lists in-app notices. Settings cover email copies of those notices, a password change, **Export my data**, and a deletion request. Email copies still land only in the Outbox for the test recipient.
7. **Admin.** `/admin` shows the application funnel, active members, posts, and introductions. `/admin/moderation` is the queue for flagged posts and open reports. A member page can suspend, reinstate, or remove a non-admin.
8. **Test console.** **Seed sample members** adds Dana, Gabe, and Lena Testfloor (`test.dev.floor@example.com`, `test.gc.floor@example.com`, `test.lp.floor@example.com`, password `cornicio-demo`). They are `is_test`. Dana has a published seeking post and a held post, Gabe has an accepted thread with Dana and a pending introduction to Lena, and Gabe can open Dana’s deal room. **Delete all test data** removes them with the other `is_test` rows.

Also open `/legal/seeking-raising` and `/legal/deal-room-nda`. Both show the draft banner and the version line.

## Dues after approval

Nothing in this section charges a real card. A live Stripe secret is ignored. If `STRIPE_SECRET_KEY` starts with `sk_test`, `STRIPE_WEBHOOK_SECRET`, and the matching `STRIPE_PRICE_GC`, `STRIPE_PRICE_BROKER`, or `STRIPE_PRICE_ADVISOR` are all set, Pay dues uses Stripe Checkout in test mode, charges $199 per month from the app, and adds a one-time 50% coupon so the first invoice is $99.50. If any of those is missing, the page is labelled **TEST** and uses the simulated payment buttons. Private Floor stores no card number.

Month-to-month dues, chosen from the approved role: general contractor $199 per month (first month $99.50), broker or mortgage broker $199 per month (first month $99.50), attorney or advisor $199 per month (first month $99.50). The fee is never based on a deal.

1. On `/admin/test`, choose **Seed payment-due member**. Gina Paytest (`test.gc.pay@example.com`, password `cornicio-demo`) is an is_test general contractor with status **Approved, payment due**.
2. `/admin/applications` (filter **Approved**) shows a payment status column. Open her row or `/admin/members`. The dues panel shows **Payment due**, first month $99.50 then $199 per month, and no next-charge date yet.
3. `/admin/outbox` is where the approval notice goes when you approve a new paying applicant. The notice is addressed only to the test recipient and contains `/pay/` plus a token. **Resend payment link** writes another Outbox notice.
4. Sign out of the admin session. Open that `/pay/…` link, or sign in as Gina. The floor redirects to **Pay membership dues**. The page shows the first month next to the full monthly price, month to month, cancel anytime, the next charge date (one month out if the dues are recorded today), the schedules in English, Spanish, German, and Japanese, and a link to `/legal/membership-dues`. **Cancel anytime** records a cancellation and stops the next charge. The rest of the floor stays closed, including the feed, directory, and settings. **Sign out** is on the page.
5. Choose **Simulate a failed payment**. The status becomes **Payment failed**. The Outbox gets a failed-payment notice. Sign-in still stops on Pay dues.
6. Choose **Pay first month $99.50 (test)**. The notice says no card was charged. The floor opens, the application moves to **Approved**, and a welcome notice and a receipt are in the Outbox. Signing in again lands on the feed and the first-week checklist. The payment-link email shows the half-price first month and the full monthly price. A reminder goes out in the week before the full-price charge.
7. **Settings** shows the receipt: first month, full monthly price, simulated TEST mode, paid time, next full-price charge one month out, **Cancel anytime**, and **No card on file**. The billing portal button appears only after a Stripe test checkout that stored a customer id.
8. As admin, **Mark paid** records a manual payment and an audit event. **Waive dues** asks for a reason, comps the membership, and writes an audit event. **Save refund note** asks for a note, sets the status to refund noted, and closes the floor again until dues are paid. **Send renewal reminder** and **Send failed-payment notice** write Outbox notices. The renewal reminder needs a renewal date.
9. Approve a developer. The status is **Approved** immediately, the welcome notice does not include a payment link, and sign-in opens the floor.

## Email templates and people

Templates are at `/admin/templates`. The people board is at `/admin/crm`.

1. `/admin/templates` lists nine letters: information, thank you, welcome, needs more info, approved, declined, payment due, dues reminder, and renewal. The delivery flag offers **Outbox (test)** and **Live (not connected)**. Saving Live still writes only to the Outbox for the test recipient. It does not email the person.
2. Open a template. The preview fills `{first_name}` and the other tokens with sample values, and the letter ends with **Richard Osika, Founder**. Change a sentence, **Save version**, and the version list grows. **Restore** saves that older text as a new version. **Send test to the test recipient** puts a `[test]` copy in `/admin/outbox`.
3. Submit an application. The Outbox thank-you uses the saved template. Approve a free role and the approved letter is used. Approve a paying role and the payment-due letter is used. Needs-more-info includes the note you wrote. Decline does not include a reason. A recorded payment sends the welcome letter. A failed test payment sends the dues reminder. A renewal reminder sends the renewal letter.
4. `/admin/crm` is the pipeline: Invited, Applied, In review, Approved, Active, Declined. Search by name, email, company, or tag. **Follow-ups due** filters the board. **Export CSV** downloads the rows.
5. Open a person. The timeline shows the invite, application, emails, verification run, decision, and payment when those exist. Add a note. Set a follow-up date, tags, and an owner. Check **Do not contact**, write a reason, and save. The next letter to that email is stored in the Outbox as **Not sent** with the reason, and the timeline says the same.
6. **Add a prospect** mints an invite code and, with the box checked, puts the information email in the Outbox. Issuing a code for an invite request does the same. **Send information email** on a person sends it again. The applicant is not emailed.

## Command center

The admin home is `/admin`. A person who is not an administrator is sent back to the floor. The check runs on the server.

1. The top strip is **Needs your attention**. Each tile is a count and a link: applications awaiting a decision, needs-more-info replies, payments due or failed, reports, flagged posts, introductions and deal rooms, and CRM follow-ups due. A count above zero uses a brass border.
2. **Funnel** shows submitted, in review, approved, payment due, declined, and active members. **Last 7 days** shows new applications, decisions, Outbox notices, and new members. **Recent activity** is the audit log, newest first, and opens the full log.
3. The left navigation groups Applications & Verification, Members, Payments, CRM, Email templates & Outbox, Moderation, Content/Legal versions, Help, Settings, Audit log, and Test console. On a phone, open **Admin menu**. The command center link is active only on `/admin`.
4. **Payments** lists members who owe dues, paid, were waived, failed, or have a refund note. Due and failed rows are marked. Open the member to mark paid, waive, or resend the link.
5. **Introductions and deal rooms** lists pending introductions by name and note. The member still accepts or declines. Deal-room requests stay on the same page.
6. **Legal versions** lists each draft, its version line, and a link to the public page. Five of them are marked recorded at signup.
7. **Settings** shows the test recipient (`NOTICE_TEST_RECIPIENT`) and a Test / Live choice in large type. Notices are stored in the Outbox for that recipient. When `RESEND_API_KEY` is set, Settings says a copy is also emailed only to that inbox. The dues table shows the flat annual amounts. It is not an editor. **Sources and watchlists** is linked from the same page.
8. Invite requests and new codes stay on the command center. Issuing a code puts the information email in the Outbox and, when `RESEND_API_KEY` is set, emails it to the test recipient. Copy the code. Applicants are not emailed.

## Help

Help is the button on the lower right of signup, the public pages, and the signed-in floor.

1. Open Help on `/apply` or after sign-in. Ask what a general contractor pays. The answer includes **$199 per month** and **$99.50**, says the fee is month to month, says it is not legal, tax, or investment advice, and does not promise approval. With no `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`, the answer is the keyword FAQ. If a key is set, Help still answers only from the retrieved pages.
2. Ask whether you will be approved, ask for legal or investment advice, or ask for a verification score or a source list. Help refuses, does not invent an outcome, and points to **connect@privatefloorclub.com**. A prompt that says to ignore the rules gets the same refusal.
3. Ask something the pages do not cover. Help says it is not sure and offers the same email. Thumbs up and thumbs down stick to that question in the browser session.
4. `/admin/help` lists questions, with filters for unanswered, refused, and thumbs down. The list has the question text and the answer. It does not show a name or email. `/admin/help/faq` edits the articles Help retrieves. Unpublished articles drop out. The legal drafts stay in their files.
5. Help pauses after 20 questions in an hour for that browser session.

## Member platform (home base, assets, directory)

This is on the `platform-p0-p1` branch. It is not on the live test site. Apply the migration only on a local database, or on a database you intend to update after the current mvp test:

```
cd app
npx prisma migrate deploy
npm run db:seed-platform
```

`db:seed-platform` refuses a Render connection string. It loads states, major metros, principal counties, asset types, fields, and specialties, then backfills home base from the free-text city and state. It also adds TEST members at `@platform-test.example` with password `cornicio-demo`. Their names and companies start with TEST.

Remove only those rows with:

```
npm run db:cleanup-platform
npm run db:cleanup-platform -- --delete
```

The first command prints counts and deletes nothing. The second deletes the TEST platform members and outbox notices addressed to them. Market and asset rows stay. If those TEST members were the only extra rows, the baseline is Members 19, Applications 2, CRM 2 pending and 19 approved, Outbox 12, Verification 37.

County is stored and is not a filter. A member still in verification appears in the directory. The directory card shows Verified or Verification in progress. It does not show a grade, a score, an email, or a phone.

1. Sign in as a member whose dues are not outstanding. Open **Profile**. Set a home city, a home state, and a home metro. Check operating states and metros, asset focus, a specialty for your role, and a deal size band. Set who can see looking for, offering, and deal size: Members, Connections only, or Private. Save.
2. Open another member. Private and connections-only fields are hidden until you are connected. Home base, operating markets, and up to three asset labels can show. Email and phone do not.
3. Open **Network**. Filter by role, role group, state, metro, place (based in or works in), asset type, deal size, specialty, verified only, and a keyword. State **IN** does not match Austin. State **CA** does not match Chicago. A metro search can include a statewide operating row and a county inside that metro.
4. Pick a role and metro with fewer than five members. The line says **Growing market** and does not print that count. The list widens to the state, then nationwide, and says so. Phoenix has one TEST general contractor, so that search is a growing market. Dallas has five TEST developers, so a Dallas developer search can show a count.
5. Save a directory filter and check **Email me when a member matches**. When a later profile save matches it, `/admin/outbox` gets one notice. The notice names the member and the saved search. It has no grade and no phone number. The same pair is not sent again.
6. Open a member from the directory. The page still has no grade letter, score, or source list.

## Project filters

Deals (`/deals`), the Ledger (`/feed`), and the directory (`/network`) share one filter bar. The address bar is the filter. Copy link copies that URL. A saved filter is stored for you on that page only.

1. On `/deals`, set asset class, a state, project stage (land / entitlement, pre-construction, under construction, stabilized, recap), capital size, what is needed (equity, debt, GC, broker, legal / advisory), the poster’s role, and a posted window (7, 30, or 90 days). Add a keyword. Choose newest, oldest, or best match. Apply. The result count names the filters that are on. Clear returns to every public deal.
2. Open Saved filters, name the current link, and save it. The named link comes back. Remove deletes only that saved row.
3. On `/feed`, the same project filters apply to posts. The For you, Deals, Seeking, and My circle tabs keep the filters. A new raising or seeking post asks for stage and what is needed.
4. On `/network`, filter by asset class (including condo and storage), state, deal type, what is needed, and role. Sort by name or newest. Stage, capital size, and posted date stay on deals and posts.

## Round 2 checks

1. A suspended member who is already signed in lands on **Account suspended**, with a sign-out button and connect@privatefloorclub.com. They are not sent back and forth between sign-in and the floor.
2. The application report and the company report use the same website result. A made-up name on example.com is not a pass.
3. Help answers what a general contractor pays ($199 per month, first month $99.50; brokers and attorneys $199 per month, first month $99.50; month to month and due only after approval), why a post was held, and how to request an introduction. Those answers have no `[DATE]` and no raw markdown.
4. Signup step 4 shows those dues. Draft wording stays on the legal pages as the banner. Member-facing text uses October 24, 2026 instead of `[DATE]`.
5. A payment-due member is absent from the directory and cannot receive an introduction until the dues are recorded.
6. A seeking post keeps the dollar band you picked. **$5M+** is not shown as Other scope.
7. Delete applicant also removes the CRM person and the linked member account. CRM people, invite requests, and invite codes have their own delete controls. **Delete records from the last N hours** is on the test console, separate from Delete all test data.
8. The news check reads Google News RSS, Bing News RSS, and GDELT for the quoted person, the quoted company, and the company plus city. Matching headlines show the source, the New York date, and an Open article link. A blocked feed is listed under what could not be checked for free.
9. Accepting an introduction notifies the requester. Approving a deal room notifies the requester. Email subjects do not include the founder sign-off. That line stays at the end of the letter. Pay dues says dues are waived only when an administrator waived them. A simulated payment is labelled TEST. Renewal dates are America/New_York calendar dates. Data export downloads a file that includes the member's own email. A member reply is separate from the track record and shows a New York time. An application with no report has **Run verification** on the list.

## What the offline samples are for

The strong LEGIT row is there so you can see that verdict without waiting on EDGAR, CourtListener, or web search. Re-run that row if you want to see which live sources answered from the server you are using. A blocked source is unavailable and is listed under “What I could not check for free.” A source that answers with no match is “No data found.” Neither one approves anyone.
