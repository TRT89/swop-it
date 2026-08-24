# Swop-it

A local sharing marketplace where neighbours lend the things they own and
exchange the skills they have — paid for with **Social Points (SP)** instead of
money.

> People own things they rarely use and have skills other people need.

You earn Social Points when someone uses your offer, and you spend them on
something completely different from someone completely different. No 1:1 barter,
no money, no need to find the one person who happens to want exactly what you
have.

---

## Table of contents

- [What Swop-it is](#what-swop-it-is)
- [Quick start](#quick-start)
- [Demo accounts](#demo-accounts)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Database structure](#database-structure)
- [How Social Points work](#how-social-points-work)
- [Application routes](#application-routes)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [Testing](#testing)
- [Security](#security)
- [Deploying later](#deploying-later)
- [What is deliberately not built yet](#what-is-deliberately-not-built-yet)

---

## What Swop-it is

Every listing is one of four combinations:

|                | **Offer** (you provide)          | **Request** (you need)              |
| -------------- | -------------------------------- | ----------------------------------- |
| **Product**    | "I can lend my pressure washer"  | "Looking for a garden shredder"     |
| **Service**    | "I can help assemble furniture"  | "Need someone to mow a large lawn"  |

A Swop runs through a fixed lifecycle, and **Social Points move only at the very
end, when both members have confirmed it is finished**:

```
Listing → interest → chat → request → accepted → active
        → both confirm completion → points transferred → rating
```

---

## Quick start

You need [Node.js 20 or newer](https://nodejs.org). Nothing else — no Docker, no
database to install, no cloud account, no API keys.

```bash
git clone <this repository>
cd swop-it

npm install
npm run dev
```

Open <http://localhost:3100>.

Swop-it runs on **port 3100**, not the usual 3000, so it can sit alongside
another local project without a collision. To use a different port, change the
`-p` flag in the `dev` script in `package.json`, or run
`npx next dev -p 4000` directly.

`npm run dev` creates the database, applies the schema and loads the demo data
before starting the server, so the marketplace is full of listings the first
time you open it. Running it again reuses the same database and reloads the demo
data.

**Starting completely fresh:**

```bash
npm run db:reset
```

That deletes the local database and rebuilds it from scratch.

### If a database command says it cannot open the database

The embedded database allows one writer at a time. Two things cause this:

1. **The dev server is still running** — it holds the database open. Stop it
   with Ctrl-C and run the command again.
2. **The dev server was killed hard** (not Ctrl-C) and left the database
   mid-write. Run `npm run db:reset` to rebuild it. Nothing is lost that
   `npm run db:seed` does not put back.

The commands print both of these when they fail, so you do not have to remember
them.

---

## Demo accounts

Every seeded account uses the password `swopit123`.

| Email                  | Who                | Why you would use it                                          |
| ---------------------- | ------------------ | ------------------------------------------------------------- |
| `demo@swop-it.local`   | Tobias Lang        | The main demo account: 145 SP, listings, history, Swoppies, messages |
| `anna@swop-it.local`   | Anna Weber         | The other side of an active Swop with Tobias                  |
| `mark@swop-it.local`   | Mark Fischer       | Has a Swop with Tobias waiting for completion confirmation    |
| `admin@swop-it.local`  | Swop-it Admin      | Sees the admin dashboard at `/admin`                          |

The login form is pre-filled with the demo account, so you can just press
**Log in**.

Other seeded members: `lena@`, `jonas@`, `sofia@`, `david@`, `mira@`
(all `@swop-it.local`).

### Try the whole flow yourself

1. Log in as **Tobias** and create a listing, e.g. "Ladder — 10 SP / day".
2. Log out, log in as **Anna** (a second browser profile or a private window is
   easiest), find the listing in the marketplace and message Tobias.
3. Press **Request Swop**.
4. Back as Tobias: **Accept**, then **start Swop**, then **Confirm it is finished**.
5. As Anna: **Confirm it is finished**.
6. The points move. Check both wallets at `/wallet` — and rate each other.

---

## Tech stack

| Layer          | Choice                                    |
| -------------- | ----------------------------------------- |
| Framework      | Next.js 16 (App Router, Server Components, Server Actions) |
| Language       | TypeScript, strict mode                    |
| Styling        | Tailwind CSS v4                            |
| Icons          | Lucide                                     |
| Database       | PostgreSQL 18, embedded via PGlite         |
| ORM / schema   | Drizzle ORM + Drizzle Kit migrations       |
| Validation     | Zod                                        |
| Forms          | Server Actions with `useActionState` — no form library needed |
| Auth           | Own cookie sessions with bcrypt password hashing |
| Tests          | Vitest, running against a real in-memory PostgreSQL |

### One deliberate deviation from the suggested stack

The brief suggested Supabase for the database, auth and storage. This prototype
uses **PGlite** — the real PostgreSQL engine compiled to WebAssembly and run
in-process — with its own cookie-session auth instead. The reason is the brief's
own priority: *"a prototype that I can run locally."*

- Supabase's local development mode requires Docker. Supabase's hosted mode
  requires an account, a project and API keys pasted into `.env`. Either one
  puts a setup step between `git clone` and a working marketplace.
- PGlite is **real PostgreSQL**, not a substitute: the same enum types, the same
  foreign keys, the same `CHECK` constraints, the same transactions and row
  locks that the Social Point ledger depends on.
- Because the schema is plain PostgreSQL written in Drizzle, moving to Supabase
  (or any hosted Postgres) later means pointing the Drizzle client at a
  connection string and running the same migrations in `drizzle/`. The
  application code does not change.

Two smaller departures, both in the same spirit of avoiding dependencies that
earn nothing:

- **shadcn/ui** was not installed. The UI needs roughly ten small components, so
  they are written directly in `src/components/ui/` in the same style, without
  pulling in the CLI and its Radix dependency tree.
- **React Hook Form** was not used. Every form in the app is a Server Action
  driven by `useActionState`, which already gives per-field errors, pending
  states and progressive enhancement, so the library had nothing left to do.

Everything else follows the brief.

---

## Architecture

Fifteen bullets, no more:

1. One Next.js application, one repository, no separate backend and no services.
2. The App Router with Server Components: pages read the database directly, so
   there is no REST layer to keep in sync with the UI.
3. All writes go through **Server Actions**, so every mutation is server-side by
   construction and there is no public write API to secure separately.
4. Route groups split the app in two: `(auth)` for the logged-out shell,
   `(app)` for the shell with the header and the mobile navigation bar.
5. The marketplace and listing pages work logged out — you can browse before you
   join, which is the first step of the intended user journey.
6. **Business logic lives in `src/lib/*-service.ts`, never in a page.** Server
   Actions in `src/server/` are thin: authenticate, validate with Zod, call the
   service, revalidate. That is what makes the logic testable without a browser.
7. `src/lib/points.ts` is the only module allowed to move Social Points, and it
   only accepts a database transaction handle.
8. `src/lib/swap-service.ts` owns the Swop lifecycle and every authorisation
   rule that goes with it.
9. Read queries are grouped by area (`listings.ts`, `swap-queries.ts`,
   `message-queries.ts`, `profile-queries.ts`, `metrics.ts`) and return exactly
   what a page renders.
10. Distance is computed as a haversine expression **inside SQL**, so "nearest"
    sorting and radius filtering are correct across the whole result set rather
    than only the current page.
11. Marketplace filters live in the URL, so a search is shareable, back-button
    friendly and rendered on the server.
12. Sessions are a random 256-bit token in an `httpOnly` cookie, checked against
    a `sessions` table on every request. No JWTs to invalidate.
13. Notifications are written in the same transaction as the event that caused
    them, so a notification can never describe something that did not happen.
14. Listings without a photo render a generated cover (a deterministic gradient
    plus the category emoji), so the marketplace looks complete before anyone
    uploads an image and the prototype needs no storage service.
15. The database file lives in `./.swopit-data` and is gitignored; the schema
    lives in `drizzle/` and is committed.

### Directory layout

```
src/
  app/
    (auth)/            login, signup, auth server actions
    (app)/             everything behind the app shell
      dashboard/  marketplace/  create/  swaps/
      messages/   wallet/       profile/ settings/
      notifications/  feedback/ admin/
    page.tsx           public landing page
  components/          UI primitives and shared components
  db/
    schema.ts          the whole database schema
    client.ts          the shared connection
    migrate.ts         migration runner
    seed.ts            demo data
  lib/                 domain logic and read queries
  server/              server actions
drizzle/               generated SQL migrations
tests/                 Vitest suites
```

---

## Database structure

```
users ──1:1── profiles
  │
  ├──1:1── wallets ──1:n── wallet_transactions
  ├──1:n── listings ──1:n── listing_images
  │             └──n:1── categories
  ├──n:m── conversations (via conversation_members) ──1:n── messages
  ├──1:n── swaps (as provider or as requester)
  ├──1:n── reviews (as author or as subject)
  ├──n:m── swoppies (self-referencing)
  ├──n:m── badges (via user_badges)
  ├──1:n── notifications
  ├──1:n── reports
  ├──1:n── feedback
  └──1:n── sessions

swaps ──n:1── listings
      ──n:1── provider (users)     ← earns the Social Points
      ──n:1── requester (users)    ← spends the Social Points
      ──1:n── wallet_transactions  ← exactly two, once completed
      ──1:n── reviews              ← at most one per member
```

Every table has foreign keys with explicit `ON DELETE` behaviour, and indexes on
the columns actually filtered and sorted on.

The two constraints that carry the most weight:

```sql
-- A swap can never pay out twice for the same side.
CREATE UNIQUE INDEX wallet_tx_swap_side_uniq
  ON wallet_transactions (swap_id, user_id, type);

-- Nobody can ever be pushed below zero Social Points.
ALTER TABLE wallets ADD CONSTRAINT wallets_balance_non_negative
  CHECK (balance >= 0);
```

`profiles`, `listings` and `swaps` already carry `latitude`/`longitude` columns.
They are populated from the member's city today; swapping in real geocoding is a
change to one insert, not a migration.

---

## How Social Points work

Social Points are treated as an **accounting ledger**, not a number to increment.

- `wallet_transactions` is append-only. Rows are never updated or deleted.
- `wallets.balance` is a cached roll-up of that ledger, and it is only ever
  written in the same database transaction as the ledger row that justifies it.
- `src/lib/points.ts` is the only place that writes either, and
  `postLedgerEntry` **requires a transaction handle** — it cannot be called with
  the plain connection. That is not stylistic: the first version accepted either,
  and a rejected balance update left an orphaned ledger row behind. A test caught
  it, and the type now makes it impossible.

Transaction types: `WELCOME_BONUS`, `SWAP_EARNED`, `SWAP_SPENT`, `BONUS`,
`ADMIN_ADJUSTMENT`.

New members receive **50 SP** as a `WELCOME_BONUS` — booked through the ledger
like everything else, so their balance and their history agree from the first
second.

### Settling a Swop

When the second member confirms completion, one transaction:

1. re-reads the swap row `FOR UPDATE`, so two simultaneous confirmations cannot
   both believe they are the second one;
2. refuses if the swap is already `COMPLETED`;
3. writes `SWAP_SPENT −15` for the requester and `SWAP_EARNED +15` for the
   provider;
4. rolls both wallet balances forward;
5. writes the notifications.

If any step fails — most likely the payer's balance no longer covering it — the
whole transaction rolls back and **nothing** moves. There is no partial state.

A **15 SP** Swop between Anna and Tobias produces exactly:

| user   | type          | amount | swap_id |
| ------ | ------------- | ------ | ------- |
| Anna   | `SWAP_SPENT`  | `−15`  | same    |
| Tobias | `SWAP_EARNED` | `+15`  | same    |

The admin dashboard cross-checks every wallet against the sum of its ledger on
each load and shows a red banner if any of them ever disagree.

---

## Application routes

| Route               | What it is                                                        |
| ------------------- | ----------------------------------------------------------------- |
| `/`                 | Public landing page                                               |
| `/login`, `/signup` | Authentication (signup grants the 50 SP welcome bonus)            |
| `/marketplace`      | Search, filters, sorting — works logged out                       |
| `/marketplace/[id]` | Listing detail, message the owner, request a Swop                 |
| `/create`           | Three-step listing creation                                       |
| `/dashboard`        | Balance, open Swops, nearby and recent listings                   |
| `/swaps`            | All your Swops, with the ones needing you at the top              |
| `/swaps/[id]`       | One Swop: lifecycle, confirmation, rating                         |
| `/messages`         | Conversation list with unread indicators                          |
| `/messages/[id]`    | One conversation, linked to its listing                           |
| `/wallet`           | Balance, earned, spent, and the full ledger                       |
| `/profile/[id]`     | Public profile: offers, requests, reviews, Swoppies, badges       |
| `/settings`         | Edit profile, log out                                             |
| `/notifications`    | In-app notifications                                              |
| `/feedback`         | FirstMover feedback (idea / bug / general)                        |
| `/admin`            | Metrics, members, listings, reports, ledger, feedback (admin only)|

---

## Environment variables

**None are required.** The prototype runs on its defaults.

| Variable          | Default          | What it does                              |
| ----------------- | ---------------- | ----------------------------------------- |
| `SWOPIT_DATA_DIR` | `./.swopit-data` | Where the embedded database is stored. Set it to `memory://` for a throwaway database — that is what the test suite does. |

No secrets exist in this prototype, so nothing sensitive can be committed. When
you move to a hosted database, its connection string belongs in `.env.local`,
which is already gitignored.

---

## Scripts

| Command              | What it does                                                   |
| -------------------- | -------------------------------------------------------------- |
| `npm run dev`        | Migrate, seed, then start the dev server on port 3100          |
| `npm run dev:only`   | Start the dev server without touching the database             |
| `npm run build`      | Production build                                               |
| `npm start`          | Run the production build                                       |
| `npm test`           | Run the test suite                                             |
| `npm run test:watch` | Run the tests in watch mode                                    |
| `npm run typecheck`  | TypeScript, no emit                                            |
| `npm run lint`       | ESLint                                                         |
| `npm run db:migrate` | Apply migrations                                               |
| `npm run db:seed`    | Reload the demo data (replaces what is there)                  |
| `npm run db:setup`   | Migrate then seed                                              |
| `npm run db:reset`   | Delete the database and rebuild it from scratch                |

### Changing the schema

```bash
# 1. edit src/db/schema.ts
npx drizzle-kit generate --name your_change   # writes drizzle/000N_your_change.sql
npm run db:migrate
```

Generated migrations are committed. Never edit one that has already been applied.

---

## Testing

```bash
npm test
```

22 tests run against a real in-memory PostgreSQL — the same engine, the same
constraints, no mocks — covering the parts where a bug costs someone real
Social Points:

- the welcome bonus, and balance always matching the ledger
- refusing to push a wallet below zero, with nothing left behind
- refusing a request the member cannot afford
- a Swop settling only on the **second** confirmation
- exactly one debit and one credit per completed Swop
- **never transferring points twice for the same Swop**
- rejecting a second confirmation from the same member
- a payer whose balance ran out after the request: no partial transfer
- cancelled and declined Swops moving nothing
- only the listing owner being able to accept or decline
- members being kept out of Swops they are not part of
- `REQUEST` listings paying in the right direction (the owner pays, the
  responder earns)

These tests found three real bugs during development — an orphaned ledger row, a
transaction deadlock, and a timestamp that broke a typed update. All three are
fixed; the commit history describes each one.

---

## Security

- **Every mutation is a Server Action** that starts by resolving the session.
  There is no client-writable API surface.
- **Every input is validated with Zod on the server**, whatever the form did.
- **Authorisation is checked against the database, not the request.** Updates are
  scoped in the `WHERE` clause (`... AND owner_id = $session_user`), so a
  tampered form updates zero rows instead of somebody else's.
- **Social Points cannot be manipulated by a member.** There is no code path
  from a request to a balance except completing a Swop that the member is part
  of, and the ledger is the only writer.
- **Swops are only visible to their two members**; `getSwapDetail` returns
  `null` for anybody else, which renders a 404.
- Passwords are hashed with bcrypt. Sessions are 256 bits of randomness in an
  `httpOnly`, `sameSite=lax` cookie, `secure` in production, checked for expiry
  on every request.
- Login, signup, messaging, listing creation, Swop requests and reports are all
  rate-limited.
- Login failures return one message whether or not the account exists.
- Exact addresses are never stored or shown — only city and postal code.

**Known limitation, stated plainly:** the rate limiter keeps its counters in
process memory. That is correct for a prototype on one machine and would need a
shared store before running several instances.

**Worth knowing if you run other projects on localhost:** browsers scope cookies
by hostname, not by port, so every app on `localhost` shares one cookie jar
regardless of which port it listens on. Swop-it's session cookie is named
`swopit_session` specifically so it cannot collide with another local project's
session — changing the port is about the port being free, not about isolation.
If you ever do see two local apps fighting over a session, the cookie name is
what to check, in `src/lib/auth.ts`.

**A second one:** balance is checked when a Swop is requested and again, under a
lock, when it settles. There is no escrow in between, so a member can commit to
more open Swops than they can currently pay for. The settlement is still safe —
it refuses rather than going negative — but the failure surfaces late. A `HOLD`
ledger type would fix this and the schema already has room for it.

---

## Deploying later

The application is a standard Next.js app and deploys to Vercel, Netlify, Fly.io
or a container without changes. The database is the one thing to decide.

**Moving to a hosted PostgreSQL (Supabase, Neon, RDS, anything):**

1. `npm i postgres` and point Drizzle at it in `src/db/client.ts`:

   ```ts
   import { drizzle } from "drizzle-orm/postgres-js";
   import postgres from "postgres";

   export const db = drizzle(postgres(process.env.DATABASE_URL!), {
     schema,
     casing: "snake_case",
   });
   ```

2. Set `DATABASE_URL` in the hosting environment.
3. Run the existing migrations in `drizzle/` against it.

Nothing else changes — the schema is already plain PostgreSQL and the
application never touches PGlite directly.

For **Supabase Auth** specifically, replace `src/lib/auth.ts` with Supabase's
client. Everything downstream depends only on `getCurrentUser()` returning a
user id, so the change is contained to that one file.

The prototype writes no files, so image uploads are the other thing to add:
`listing_images` already exists, and the create form accepts an image URL today.

---

## What is deliberately not built yet

Named here so nothing looks accidentally missing. All of these were out of scope
for the MVP:

Real money payments · buying Social Points · business profiles · promoted
listings · search alerts · insurance · identity-document verification · phone
and address verification · image uploads to object storage · real-time
websockets (the chat updates on refresh) · email notifications · native apps ·
recommendation AI · internationalisation.

There are **no fake buttons**. Anything visible in the interface works. Where a
feature is genuinely future work, the interface says so in words — for example
the settings page states that phone and identity verification are planned but
not part of the prototype.

---

## The hypothesis this prototype exists to test

> People are willing to provide unused products and personal skills to people
> around them when the value they earn can later be exchanged for unrelated
> products and services within the same community.

The admin dashboard tracks the numbers that answer it: how many listings become
Swop requests, how many requests get accepted, how many accepted Swops actually
complete, and how many Social Points are circulating rather than sitting still.
