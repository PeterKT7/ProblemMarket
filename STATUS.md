# ProblemMarket — Where Things Stand

_Last updated when you stepped away (2026-05-17). Read this first when you get back._

## TL;DR

The site is live on the internet at **https://problemamvp.vercel.app**, you can log in as god admin, and every form on the landing page now writes to a real database. Per-case shareable URLs are live (e.g. `/cases/042`) so you can email a specific sponsor a link to the specific problem you wrote for them. Stripe is wired but using placeholder keys — flip them when you want to take real cards.

## How to log in as god admin

### Easy path (right now, while session is fresh)

Already done locally — your local browser at http://localhost:3000/admin is signed in.

### Prod login link (paste in your browser)

```
https://fbpumjbsfbrqdopbmpoz.supabase.co/auth/v1/verify?token=58620a8f7169c28bba29c1192c5f5e1d893e1c46687d5248e1c511e0&type=magiclink&redirect_to=https://problemamvp.vercel.app/login
```

Single use, ~1 hour to expire. Click it → /login auto-completes the session → bounces you to /dashboard → click "Admin →" in the nav. Tell me "log me in" anytime and I'll mint a fresh one.

### Once Resend is wired (5 min, optional)

You'll be able to go to `/login`, type your email, click the magic link in your inbox like a normal app. The current bypass exists because Supabase's default SMTP rate-limited us after 4 sends per hour.

## URLs you should know

| URL | What it is |
|-----|-----------|
| https://problemamvp.vercel.app | Public landing — your editorial site, unchanged |
| https://problemamvp.vercel.app/cases/042 | **NEW** — Per-case shareable page. Replace 042 with any case_no in your DB. Drop this in cold emails. |
| https://problemamvp.vercel.app/login | Magic-link login |
| https://problemamvp.vercel.app/dashboard | Sponsor's view of their own pledges / applications |
| https://problemamvp.vercel.app/admin | **God admin** — every pledge, intake, solver, follow, waitlist email |
| https://problemamvp.vercel.app/api/cases | Public JSON of the docket |
| https://app.supabase.com/project/fbpumjbsfbrqdopbmpoz | Your Supabase project — edit any case row directly in Table Editor |
| https://vercel.com/peterkt7s-projects/problemamvp | Vercel dashboard for deploys & env vars |
| https://github.com/PeterKT7/ProblemMarket | The repo |

## What you can do RIGHT NOW from the admin dashboard

1. **See every form submission** — anyone who pledges, submits a problem, applies as a solver, joins the waitlist, or follows a case shows up here in real time.
2. **Track pool totals per case** — Pledged (intent), Card on file, Unique pledgers, Intake (new), Solvers (pending).
3. **Edit any case** — go to Supabase → Table Editor → `cases` → click a row → change anything. Updates land instantly on `/cases/<n>` and `/api/cases`.
4. **Add new cases** — same Table Editor, click "+ Insert row". Fill case_no, slug, title, sponsor_label, bounty_amount_cents (in CENTS, so $14M = 1400000000), pool_target_cents, deadline, set status='open'. It's immediately live at `/cases/<your_case_no>`.

## What was built this session

### Backend infrastructure
- **Next.js 15 + App Router** while preserving the static landing verbatim in `public/`
- **Supabase** (Postgres + Auth) with 8 tables: profiles, cases, pledges, solver_applications, intake_submissions, case_follows, waitlist, audit_log. RLS on every table. Pool totals auto-recompute via DB trigger.
- **Stripe SetupIntent flow** for card-on-file pledges (no charges until you say so). Real keys not yet installed — currently placeholders.
- **Magic-link auth** via Supabase. God admin gated by `ADMIN_EMAILS` env var (your gmail + icloud).
- **Admin-only `POST /api/admin/charge-case`** that fans out PaymentIntents against every card-on-file pledge for a case. Dry-run mode included.

### API routes (all live in prod)
- `POST /api/intake` · `POST /api/solver` · `POST /api/pledge` · `POST /api/follow` · `POST /api/waitlist`
- `POST /api/pledge/setup-intent` · `POST /api/pledge/finalize` · `POST /api/admin/charge-case`
- `POST /api/webhooks/stripe` · `GET /api/auth/callback` · `GET /api/cases`

### Pages
- `/login` · `/dashboard` · `/admin` · `/pledge/confirm/[id]` (Stripe Elements) · **NEW** `/cases/[caseNo]`

### Static landing updates
- All four form stubs (intake, solver, pledge, waitlist) now POST to real APIs
- Pledge confirmation injects a "Secure with card on file" CTA
- Cards have a small "Open Case 042 →" permalink + cmd-click opens new tab to the shareable page
- Auto-opens pledge modal when you arrive from `/cases/042?pledge=042`

## Suggested next moves

### Tonight (5–10 min)
1. **Edit case 042's brief, success criteria, and ruled-out fields** in Supabase Table Editor. The page renders whatever you write. Cases 043–049 are stubs — fill in the ones that matter to you.
2. **Add 2-3 new real cases** you actually want to surface. The schema is ready; you don't need any new code.

### This week (the actual money-making work)
1. **Pick 3 specific sponsors** (CTOs, foundation heads, fund GPs) you have an in with.
2. **Write 3 cases for them** — one each, anchored on the actual bottleneck you've heard them describe.
3. **Email each one** a personal note + a direct link `https://problemamvp.vercel.app/cases/<their_case>`. The page does the pitching.
4. **Goal: 1 pledge with card on file before week's end.** That's your social proof for the next 20 emails.

### When pledges arrive
1. **Wire Resend** (`RESEND_API_KEY` in Vercel envs) so login emails actually arrive — 5 min.
2. **Wire Stripe live keys** in Vercel envs — replace the two `..._placeholder_replace_when_ready` entries with real `sk_live_...` / `pk_live_...`.
3. **Hit `POST /api/admin/charge-case`** when a case crosses its activation threshold. Dry-run first.

## What's intentionally still TODO

- The 8 cards on the static homepage are still hardcoded HTML (case_nos 037–045). The DB has case_nos 042–049. They overlap on 042–045. The cards don't yet dynamically pull from the DB — that's a future cleanup. For now: the cards on the static landing are *marketing*; the real source of truth and shareable URLs come from the DB and `/cases/[caseNo]`.
- No solver bidding flow yet (solvers can apply for access but no per-case proposals). Add when you have ≥5 approved solvers.
- Refund-with-6%-bonus on threshold failure is not wired. Only needed when a real case fails to fund.
- Rate limiting is in-memory (per Vercel function instance). Swap for Upstash Redis once traffic justifies.

## How everything is wired

```
[ peterfugleberg.com static landing in public/ ]
         │
         ├─ forms POST → /api/intake, /api/solver, /api/pledge, /api/follow, /api/waitlist
         │                       │
         │                       ▼
         │              [ Supabase Postgres ]  ──→  [ Resend ] confirmation emails
         │                       ▲
         ▼                       │
[ /cases/[caseNo] page ] ────────┤
                                 │
[ /login → magic link ] ─→ [ Supabase Auth ]
         │                       │
         ▼                       ▼
[ /dashboard / /admin ] ←─ session cookie via @supabase/ssr middleware
         │
         ▼
[ POST /api/admin/charge-case ] ─→ [ Stripe ] PaymentIntents over card-on-file pledges
                                       │
                                       ▼
                                [ /api/webhooks/stripe ] keeps pledge state in sync
```

## Files to look at if you want to understand the system

- [SETUP.md](./SETUP.md) — full setup from scratch (you've already done this)
- [supabase/migrations/001_init.sql](./supabase/migrations/001_init.sql) — the schema
- [app/admin/page.tsx](./app/admin/page.tsx) — what god admin sees
- [app/cases/[caseNo]/page.tsx](./app/cases/[caseNo]/page.tsx) — the shareable case page
- [public/script.js](./public/script.js) — the form wiring on the static landing
- [lib/](./lib) — supabase / stripe / email / auth helpers

When you're ready, just say what's next.
