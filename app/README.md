# FrontDoor MVP

Invite-only network for real estate deal teams. This app lives in `app/` and does not replace the static prototype at the repository root (`index.html`, `app.js`, `app.css`, `base.css`, `desktop.css`).

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
| `AUTH_URL` | Public origin, no trailing slash (`http://localhost:3000` locally) |
| `AUTH_TRUST_HOST` | Set to `true` behind Render's proxy |

### Demo login

Every seeded member uses the password `frontdoor-demo`.

| Email | Role |
| --- | --- |
| marcus.hale@halerow.example | Developer, admin, Confirmed |
| jordan.ellis@ellisarch.example | Pending application (cannot sign in yet) |

Invite code: `FD-7K2M-91QX`.

Counterparty links (no login):

- http://localhost:3000/confirm/demo-halsey-confirm
- http://localhost:3000/confirm/demo-nora-confirm (approving this moves Nora Singh from Invited to Confirmed)

All people, projects, and deals are fictional.

## What you can do

- Apply with an invite code, role, credential, and references.
- Admin queue at `/admin/applications`: approve (creates an Invited member) or reject.
- Admin member list at `/admin/members`: set Invited / Verified / Confirmed.
- Profiles with a track record. Request a counterparty vouch; the link is logged by the console email adapter.
- Feed with updates, **Deal** posts (raising an amount), and **Seeking** posts (role needed), plus likes and comments.
- Deals board filtered by role, market (NJ/NY/CT), and size.
- Deal page: request access with a required NDA checkbox. The sponsor approves or declines. The deal room lists approved members.
- Direct messages.
- Network directory with role filters and connect requests.
- Admin dashboard with invite codes and counts.

## Tests

```bash
npm test
npm run typecheck
```

`npm test` covers invite rules, the 16 roles, deal filters, NDA gating, connection rules, and the confirmation tier change. It does not need a database.

## Deploy on Render

The Blueprint is `app/render.yaml`. It defines a Node web service (`frontdoor-mvp`, `rootDir: app`) and Postgres (`frontdoor-db`) in Oregon. It is intentionally not at the repository root, so it does not replace a Blueprint or static site already configured from `main`.

1. In the Render Dashboard, create a Blueprint and set the Blueprint path to `app/render.yaml`.
2. Apply it. Render builds from `app/`, runs `prisma migrate deploy` before the new instance goes live, and starts `npm start` (`next start -H 0.0.0.0`, which listens on `PORT`).
3. After the first deploy, set `AUTH_URL` to the service URL (for example `https://frontdoor-mvp.onrender.com`) with no trailing slash. The Blueprint marks `AUTH_URL` as `sync: false` so later Blueprint syncs do not wipe it. `AUTH_SECRET` is generated. `DATABASE_URL` comes from the database.
4. Seed once from a shell with `DATABASE_URL` set, from the `app/` directory: `npm run db:seed`. Do not run the seed on every deploy; it clears and rewrites demo rows.
5. Health check: `GET /api/health`.

The web plan is `starter` and the database plan is `basic-256mb`. Change those in the Blueprint before the first apply if you want a different size. Database name, user, region, and Postgres major version cannot be changed later.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server on `0.0.0.0` and `$PORT` (default 3000) |
| `npm run build` / `npm start` | Production build and server |
| `npm run db:migrate` | `prisma migrate deploy` |
| `npm run db:seed` | Fictional demo data |
| `npm test` | Vitest |
| `npm run typecheck` | `tsc --noEmit` |
