# Private Floor MVP

The vetted circle for real estate deal teams. The display name is **Private Floor**. The community is the **Private Floor Club** where a longer name is needed. Both strings, the tagline, and the wordmark live in `src/lib/brand.ts`. Change that constant to rename titles, the logo, emails, and seeded copy. This app lives in `app/` and does not replace the static prototype at the repository root.

Members apply with an invite code, pick one of 16 roles, and submit a name, email, password, company, and city. A business card (JPG, PNG, or PDF, up to 5 MB) is optional and encouraged. References are optional. An admin approves or rejects the application. Approved members start at **Invited**. Membership tier is **Invited** or **Confirmed**. Confirmed means an admin accepted a vouch. The brass **Verified** badge is a separate verification file, not a third tier. A counterparty can confirm a track-record project from a tokenized link (no account). That vouch waits for an admin before the member becomes **Confirmed**.

The product does not offer securities, take subscriptions, or process payments. Deal posts are member notes. A deal room only lists people the sponsor approved after an NDA acknowledgement.

## Stack

Next.js (App Router, TypeScript), Tailwind CSS, PostgreSQL, Prisma, Auth.js email/password (JWT sessions). On this test, every notice is stored in the admin Outbox and delivered only to `NOTICE_TEST_RECIPIENT` (default `rich@privatefloorclub.com`). Applicants are not emailed. Signup, the verification recommendation, and the admin walkthrough are in `docs/TEST-GUIDE.md`. Scoring rules are in `docs/VERIFICATION.md`.

## Local setup

Requirements: Node 20+, PostgreSQL 14+.

```bash
cd app
cp .env.example .env
# edit DATABASE_URL and AUTH_SECRET
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Open http://localhost:3000.

Generate `AUTH_SECRET` with `openssl rand -base64 32`.

### Environment variables

| Name | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Auth.js signing secret |
| `APP_URL` | Public origin used in email links, no trailing slash. Placeholder until you host the app. No domain is registered for Private Floor. |
| `AUTH_URL` | Auth.js origin. Use the same value as `APP_URL`. |
| `AUTH_TRUST_HOST` | Set to `true` behind Render's proxy |
| `SITE_GATE_PASSWORD` | Optional. When set, the whole site asks for HTTP Basic username `privatefloor` and this password. Unset leaves the site open. `/api/health` and `/api/stripe/webhook` stay open. |
| `ADMIN_PASSWORD` | Optional. At least 12 characters. Startup replaces every administrator password. Member passwords stay the seeded demo password. |
| `CLEAN_TEST_DATA` | Optional. `dry` logs how many testing rows would be removed. `1` removes them at startup and logs the same counts. Unset does nothing. Seeded members, projects, templates, legal pages, settings, and administrator password hashes stay. The demo invite `PF-7K2M-91QX` stays at 0 of 40 uses. |

### Demo login

Seeded members use the password `cornicio-demo`. Administrators sign in only at `/admin/login`. When `ADMIN_PASSWORD` is set to at least 12 characters, startup replaces every administrator password with that value and `cornicio-demo` no longer signs in an administrator. Member passwords stay `cornicio-demo`. The member sign-in page does not accept an administrator.

| Email | Role |
| --- | --- |
| marcus.hale@halerow.example | Developer, admin, Confirmed |
| jordan.ellis@ellisarch.example | Pending application (cannot sign in yet) |

Invite code: `PF-7K2M-91QX`.

Counterparty links (no login):

- http://localhost:3000/confirm/demo-halsey-confirm
- http://localhost:3000/confirm/demo-nora-confirm (a yes records the vouch and waits for an admin to accept it before Nora Singh can become Confirmed)
- http://localhost:3000/apply/status/demo-jordan-ellis-status

All people, projects, and deals are fictional.

## What you can do

- Apply with an invite code and a role. A business card upload is optional. The file is checked by content type and magic bytes, then stored as `bytea` in Postgres (Render free-tier disk is ephemeral, so the bytes are not written to the server disk). Members never receive a URL for it. An admin sees it on the verification case and can delete it after the case is marked Verified; that deletion is written to the case audit log. Both reference emails and “Anyone who can speak for you?” are optional. An approved member with neither gets a verification file whose references item is Not provided, and the case stays Not started until an admin reviews it. The member checklist step is “Match business card to public records.”
- `POST /api/request-invite` with name, email, role, company, city, and a short note. A honeypot field and a per-email daily limit apply. No invite code is required. The response includes a private status URL (`/invite-status/[token]`) that shows pending, issued, or declined and never includes the code. An admin issues a one-use code from `/admin` and copies it there. Private Floor does not email the code. The feed card “Invite a colleague” uses the same request.
- Sign-in says an application is pending only after that application’s password matches. Any other failure is “Those credentials were not recognized.”
- Admin queue at `/admin/applications`: each row links to a detail page (submitted time in America/New_York, and the verification case once the member exists). Approve creates an Invited member; the banner names who was approved. Reject declines the application.
- Open access requests live at `/admin/access`. An admin can approve or decline a request on behalf of the sponsor, including seeded sponsors.
- Admin member list at `/admin/members`: set Invited or Confirmed. Promoting someone to Confirmed requires an accepted counterparty vouch.
- Admin-only verification queue at `/admin/verification`. The queue and the case header include the member or the project plus its owner and city, including on a phone. Members and anonymous callers get 404 on the pages and 403 on `/api/admin/verification` when signed in as a non-admin. Checklists, internal notes, the business card, and the audit log stay on those routes. Audit times are labeled `America/New_York`. A profile shows a Verified badge only after an admin marks the full checklist complete and the file has not expired. Otherwise members see “Verification in progress.” A project explains that a vouch waits until its file is Verified.
- Profiles with a track record. A vouch request goes to a member’s inbox, or a unique portal link when the counterparty has no account. Private Floor does not email that link. A counterparty yes waits for admin review before the tier becomes Confirmed. The member is notified in Alerts. The guest confirm page shows the project only, not email, phone, or LinkedIn.
- Feed with updates, **Deal** posts (raising an amount), and **Seeking** posts (role needed), plus likes and comments.
- Deals board filtered by role, market (NJ/NY/CT), and size.
- Deal page: request access with a required NDA checkbox. The sponsor approves or declines and gets an in-app alert. The deal room lists approved members, document links, a Q&A thread, and an activity list. Seeking posts sized in square feet, units, or parcels use the Other scope filter instead of a dollar band.
- Direct messages. The inbox shows unread badges. Introductions stay in the thread. Connection requests, access requests and approvals, vouch requests, and deal-room questions are system cards, not chat bubbles. Reporting a conversation is a Report button, not a second composer. The email for any of those is only “You have a new message on Private Floor” plus a link to `/messages`. It never includes the message body or a sender’s email, phone, or LinkedIn URL. A sponsor does not see “Message sponsor” on their own deal.
- Members can report or block another member. Messaging stops in either direction after a block. Message, connection, introduction, access, vouch, and report actions have daily or hourly limits.
- Admin message review at `/admin/messages`, with contact details and an audit log of who opened the queue or a thread. Anonymous callers get 404. Signed-in members get 404 on the page and 403 on `/api/admin/messages`. `GET /api/members/[id]` and `GET /api/messages` omit another member’s email, phone, and LinkedIn URL unless the caller is an admin on the member route.
- Network directory with role filters and connect requests.
- Admin dashboard with invite codes and counts.

## Tests

```bash
npm test
npm run typecheck
```

`npm test` covers invite rules, the 16 roles, deal filters (including non-dollar seeking sizes), NDA gating, connection rules, the vouch tier rules, the verification module, and portal messaging. A counterparty confirmation does not change tier. An admin acceptance does. Non-admins are denied the verification and message-review routes. Member endpoints do not return another member’s email or phone. It does not need a database.

## Deploy on Render

The Blueprint is `app/render.yaml`. It defines a Node web service (`private-floor`, `rootDir: app`) and Postgres (`private-floor-db`) in Oregon. It is intentionally not at the repository root, so it does not replace a Blueprint or static site already configured from `main`.

1. In the Render Dashboard, create a Blueprint and set the Blueprint path to `app/render.yaml`.
2. Apply it. Render builds from `app/` and starts `npm start` (`next start -H 0.0.0.0`, which listens on `PORT`).
3. Set the service **Build command** to exactly:

   ```
   npm ci && npx prisma generate && npm run build
   ```

   Set the **Pre-deploy command** to exactly:

   ```
   npx prisma migrate deploy && npm run db:seed
   ```

   `npm run db:seed` writes fictional rows only when the database has no members. It does not call `deleteMany` on a normal deploy. If members already exist, it aligns the 26 seeded verification files and membership tiers (Invited or Confirmed), adds any missing seeded projects, and makes sure a pending access request exists for the seeded Hoboken sponsor. It does not delete members. To wipe and reseed from a shell, run `SEED=reset npm run db:seed`. Do not set `SEED=reset` on the Render service. Business cards are `bytea` rows, so a free-tier deploy does not depend on the ephemeral disk and does not delete files on restart.
4. After the first deploy, set `APP_URL` and `AUTH_URL` to that service's origin with no trailing slash. Private Floor does not have a registered domain; use whatever host the platform assigns. The Blueprint marks both as `sync: false` so later Blueprint syncs do not wipe them. `AUTH_SECRET` is generated. `DATABASE_URL` comes from the database.
5. Health check: `GET /api/health`.

The web plan is `starter` and the database plan is `basic-256mb`. Change those in the Blueprint before the first apply if you want a different size. Database name, user, region, and Postgres major version cannot be changed later.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server on `0.0.0.0` and `$PORT` (default 3000) |
| `npm run build` / `npm start` | Production build and server |
| `npm run db:migrate` | `prisma migrate deploy` |
| `npm run db:seed` | Fictional data if the database is empty; otherwise align the 26 seeded files without deleting members |
| `SEED=reset npm run db:seed` | Wipe fictional data and seed again. Do not set this on Render. |
| `npm run db:cleanup-walkthrough` | Deletes only `walk1024113042d@example.com`, `walk1024113156m@example.com`, a pending application named `Walker Desktop 3023`, and unused invite codes `PF-BZ3Z-LBJN` and `PF-53WH-8NTX` from `DATABASE_URL`. Extra arguments that contain `@` are additional exact emails. It does not wipe the database. |
| `npm test` | Vitest |
| `npm run typecheck` | `tsc --noEmit` |
