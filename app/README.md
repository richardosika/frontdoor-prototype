# Private Floor MVP

The vetted circle for real estate deal teams. The display name is **Private Floor**. The community is the **Private Floor Club** where a longer name is needed. Both strings, the tagline, and the wordmark live in `src/lib/brand.ts`. Change that constant to rename titles, the logo, emails, and seeded copy. This app lives in `app/` and does not replace the static prototype at the repository root.

Members apply with an invite code, pick one of 16 roles, and submit credentials plus references. An admin approves or rejects the application. Approved members start at **Invited**. An admin can set **Verified** or **Confirmed**. A counterparty can also confirm a track-record project from a tokenized link (no account). That vouch sets the member to **Confirmed**.

The product does not offer securities, take subscriptions, or process payments. Deal posts are member notes. A deal room only lists people the sponsor approved after an NDA acknowledgement.

## Stack

Next.js (App Router, TypeScript), Tailwind CSS, PostgreSQL, Prisma, Auth.js email/password (JWT sessions). Email is a console adapter: messages are printed to the server log.

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

### Demo login

Every seeded member uses the password `cornicio-demo`.

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

- Apply with an invite code, role, credential, and references.
- Admin queue at `/admin/applications`: approve (creates an Invited member) or reject.
- Admin member list at `/admin/members`: set Invited / Verified / Confirmed.
- Profiles with a track record. Request a counterparty vouch and copy the link from the project. A counterparty yes waits for admin review before the tier becomes Confirmed. The member is notified in Alerts.
- Feed with updates, **Deal** posts (raising an amount), and **Seeking** posts (role needed), plus likes and comments.
- Deals board filtered by role, market (NJ/NY/CT), and size.
- Deal page: request access with a required NDA checkbox. The sponsor approves or declines and gets an in-app alert. The deal room lists approved members, document links, a Q&A thread, and an activity list. Seeking posts sized in square feet, units, or parcels use the Other scope filter instead of a dollar band.
- Direct messages.
- Network directory with role filters and connect requests.
- Admin dashboard with invite codes and counts.

## Tests

```bash
npm test
npm run typecheck
```

`npm test` covers invite rules, the 16 roles, deal filters (including non-dollar seeking sizes), NDA gating, connection rules, and the vouch tier rules. A counterparty confirmation does not change tier. An admin acceptance does. It does not need a database.

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

   `npm run db:seed` writes fictional rows only when the database has no members. It does not call `deleteMany` on a normal deploy. To wipe and reseed from a shell, run `SEED=reset npm run db:seed`. Do not set `SEED=reset` on the Render service.
4. After the first deploy, set `APP_URL` and `AUTH_URL` to that service's origin with no trailing slash. Private Floor does not have a registered domain; use whatever host the platform assigns. The Blueprint marks both as `sync: false` so later Blueprint syncs do not wipe them. `AUTH_SECRET` is generated. `DATABASE_URL` comes from the database.
5. Health check: `GET /api/health`.

The web plan is `starter` and the database plan is `basic-256mb`. Change those in the Blueprint before the first apply if you want a different size. Database name, user, region, and Postgres major version cannot be changed later.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server on `0.0.0.0` and `$PORT` (default 3000) |
| `npm run build` / `npm start` | Production build and server |
| `npm run db:migrate` | `prisma migrate deploy` |
| `npm run db:seed` | Fictional data, only if the database has no members |
| `SEED=reset npm run db:seed` | Wipe fictional data and seed again |
| `npm test` | Vitest |
| `npm run typecheck` | `tsc --noEmit` |
