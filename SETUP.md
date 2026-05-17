# ProblemMarket — Backend Setup & Launch Playbook

This walks you from a fresh clone to **accepting real pledges in production** on
`problemamvp.vercel.app`. Budget: ~45 minutes the first time.

> Architecture in one sentence: the existing static marketing site is preserved
> verbatim in `public/`, served at `/` by Next.js; everything dynamic
> (`/api/*`, `/admin`, `/dashboard`, `/login`, `/pledge/confirm/[id]`) is
> Next.js App Router routes backed by **Supabase** (Postgres + Auth),
> **Stripe** (SetupIntent for card-on-file, no charges until you say so), and
> **Resend** (transactional + admin-ping emails).

---

## 0. Prerequisites

You have these per `~/.claude/CLAUDE.md`:
- Node 20+, npm 11
- Vercel CLI logged in as `peterkt7`
- GitHub: `PeterKT7` (no `gh` CLI — create repos in browser)
- Vercel project `problemamvp` already exists and serves
  `https://problemamvp.vercel.app`

You'll create three **new** external accounts (all free to start):
1. Supabase project
2. Stripe account (test mode is fine for day 1)
3. Resend account (skip for day 1 if you want; email just no-ops)

---

## 1. Install dependencies

```bash
cd /Users/peterfugleberg/Downloads/problema-mvp
npm install
```

This pulls Next.js 15, Supabase, Stripe, Resend, Zod.

Local dev test (won't hit any backend yet — every API will 500 until envs are set):

```bash
npm run dev
# → http://localhost:3000  (static landing served from public/)
# → http://localhost:3000/login  (Next.js page)
# → http://localhost:3000/admin  (will 403 until you sign in)
```

---

## 2. Create the Supabase project (10 min)

1. Go to https://app.supabase.com → **New project**
2. Name: `problemamarket`. Region: closest to you. Strong DB password — save it.
3. Wait ~2 min for provisioning.
4. **Run the schema migration.** Open SQL Editor → New query → paste the full
   contents of `supabase/migrations/001_init.sql` → **Run**.
   Then repeat with `supabase/migrations/002_seed.sql` to seed the 8-case docket.
5. **Copy the API keys.** Settings → API:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` secret key → `SUPABASE_SERVICE_ROLE_KEY` (treat like a password — server only)
6. **Configure auth redirect URLs.** Authentication → URL Configuration:
   - Site URL: `https://problemamvp.vercel.app`
   - Additional redirect URLs: add `http://localhost:3000/api/auth/callback` and `https://problemamvp.vercel.app/api/auth/callback`
7. **(Optional, recommended)** Authentication → Email templates → tweak the magic-link template to say "ProblemMarket" instead of "Your App".

---

## 3. Create the Stripe account (5 min)

1. https://dashboard.stripe.com/register — finish onboarding (you can defer
   activation/KYC until you actually want to take real money; **test mode** works
   without it).
2. Developers → API keys → copy:
   - Publishable key → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - Secret key → `STRIPE_SECRET_KEY`
3. **Webhook (you can do this after first deploy).** Developers → Webhooks →
   Add endpoint → `https://problemamvp.vercel.app/api/webhooks/stripe`
   - Events to send: `setup_intent.succeeded`, `payment_intent.succeeded`,
     `payment_intent.payment_failed`
   - Copy the signing secret → `STRIPE_WEBHOOK_SECRET`

> **Day 1 reality:** With pledges-only mode, no card is charged. The flow is:
> sponsor pledges → row in `pledges` table (status=`pending`) → optional "secure
> with card on file" link → SetupIntent confirms → status flips to
> `card_on_file`. Money only moves when you (admin) hit
> `POST /api/admin/charge-case` with `dry_run: false`.

---

## 4. Create the Resend account (3 min, optional)

1. https://resend.com → sign up → create API key → `RESEND_API_KEY`
2. To send from `hello@problemamvp.vercel.app` directly, verify the domain in
   Resend (Vercel auto-points DNS). For now you can just send from `onboarding@resend.dev`
   by setting `RESEND_FROM="ProblemMarket <onboarding@resend.dev>"` — works
   immediately, looks slightly less polished.

If you skip Resend, intake / pledge / solver submissions still save to Supabase;
you just won't get the admin-ping email. Add it within a day.

---

## 5. Wire env vars locally

```bash
cp .env.example .env.local
# fill in real values
```

Required for the site to function:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (use `sk_test_…` / `pk_test_…` to start)
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000` (dev) — override to prod URL in Vercel
- `ADMIN_EMAILS=peterfugleberg04@gmail.com`

Optional:
- `RESEND_API_KEY`, `RESEND_FROM`
- `STRIPE_WEBHOOK_SECRET`

Then:

```bash
npm run dev
```

End-to-end smoke test:
1. `http://localhost:3000` → click "Pledge" on the featured case → submit a $10K
   test pledge with your email. You should see step 3 confirmation + a "Secure
   with card on file" button.
2. Check Supabase → Table Editor → `pledges` → your row should be there.
3. Click the secure-card button → use Stripe test card `4242 4242 4242 4242`,
   any future expiry, any CVC, any ZIP → form should show "card on file" on
   reload. Status flips to `card_on_file` in DB.
4. `http://localhost:3000/login` → enter your email → check inbox → click magic link
   → lands on `/dashboard` with your pledge visible.
5. `http://localhost:3000/admin` → you should see the control room with the
   pledge + totals.

---

## 6. Push to Vercel

```bash
# from /Users/peterfugleberg/Downloads/problema-mvp
git add -A
git commit -m "v0.2 backend: supabase + stripe + admin"
git push origin main           # auto-deploys via the GitHub→Vercel link

# add env vars to production
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add STRIPE_SECRET_KEY production
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
vercel env add STRIPE_WEBHOOK_SECRET production
vercel env add RESEND_API_KEY production
vercel env add RESEND_FROM production
vercel env add NEXT_PUBLIC_SITE_URL production    # value: https://problemamvp.vercel.app
vercel env add ADMIN_EMAILS production            # value: peterfugleberg04@gmail.com

# trigger a redeploy so the new envs take effect
vercel --prod
```

Verify in prod:
- `https://problemamvp.vercel.app` still looks identical (the static landing)
- `https://problemamvp.vercel.app/admin` → login → admin dashboard
- `https://problemamvp.vercel.app/api/cases` → JSON of the docket

---

## 7. Going live with real money (when ready)

The platform is in **pledges-only** mode by default. Switching to live charges:

1. In Stripe dashboard: complete account activation (legal entity, bank
   account, KYC). Flip from test mode to live mode.
2. Update the two Stripe keys in Vercel to `sk_live_…` / `pk_live_…`.
3. Add the webhook endpoint **in live mode** with the same URL; update
   `STRIPE_WEBHOOK_SECRET`.
4. When a case's `pool_current_cents` ≥ `pool_target_cents` AND your editorial
   panel signs off, hit:
   ```bash
   curl -X POST https://problemamvp.vercel.app/api/admin/charge-case \
     -H 'content-type: application/json' \
     --cookie "sb-...=..."  \
     -d '{"case_id":"<uuid>","dry_run":true}'
   ```
   `dry_run: true` returns count + total without charging. Re-run with
   `dry_run: false` to actually charge.

The route is admin-gated (checks `ADMIN_EMAILS` against the signed-in user)
and idempotent on `pledges.charge_id`.

---

## 8. The actual go-to-market playbook (what to do this week)

You said: *make money ASAP, high ceiling, smart taste.* Here's the order of
operations the existing architecture is designed for:

### Week 1: prove demand, not infrastructure
1. **Hand-pick 5 problems** worth ≥ $5M each from your network. Edit them
   directly in the `cases` table (Supabase Table Editor) — no admin UI for
   editing exists yet, you don't need one for 5 rows.
2. **Email 25 hand-picked sponsors** (CTOs, foundation heads, fund GPs) with a
   personal note + a link to the case you wrote for them. The case page IS the
   pitch.
3. **Goal: 3 pledges of ≥ $25K each with card on file.** That's $75K of
   committed intent, which is your proof for everyone else.

### Week 2: supply side
4. **Email 50 hand-picked solvers** (PIs at relevant labs, recently-exited
   founders, top freelancers on Toptal / Polymath). Personal note + link to
   `/?#docket`. Approve them via the admin dashboard (update
   `solver_applications.status = 'approved'`).
5. **Add a stripe Payment Link** for the seriousness deposit ($500) and email
   it manually to approved solvers. This is real revenue Day 1.

### Week 3: leverage
6. **Write one essay per case** explaining why this specific problem is the
   bottleneck. Publish on Substack / problema.com. Tag the right people. The
   essays are the marketing.
7. **Add a `/cases/[slug]` page** (currently a stub directory — schema and
   data exist, just needs the page). Each case gets its own URL for sharing.

### Built-in growth loops
- Every form captures UTM params → you can A/B intake copy
- Every email through Resend is a touch point — set up "weekly docket digest"
  cron via `vercel.json` once you have > 20 subscribers
- The `case_follows` table is your warm list — email them the moment a
  follow-on case opens

---

## 9. What's intentionally NOT built (and what to add next)

- **Case detail pages** (`/cases/[slug]`) — schema is ready, route is a stub.
  Two hours of work. Do this once you have your first 3 real cases.
- **Solver bidding flow** — solvers can apply, but there's no per-case proposal
  flow yet. Add `solver_bids` table + page when you have ≥ 5 approved solvers.
- **Refund-with-6%-bonus on failure** — wire a second admin endpoint that
  hits `paymentIntents.create` for the bonus + sends regret emails. Only needed
  if a real case fails to fund.
- **Outbox-pattern email retries** — Resend rarely fails, but in case of
  outage the current code drops the email silently. Add a `notifications` table
  + cron when volume justifies.
- **Upstash Ratelimit** — current in-memory bucket is per-instance. Swap to
  Redis once Vercel scales beyond 1 function instance.

---

## 10. Quick reference

| Where | What |
|-------|------|
| `public/index.html, styles.css, script.js` | Marketing site (unchanged) |
| `app/api/*` | Server routes |
| `app/admin/page.tsx` | Operations dashboard |
| `app/dashboard/page.tsx` | User dashboard |
| `app/pledge/confirm/[id]` | Stripe Elements card-on-file |
| `supabase/migrations/*.sql` | Schema (run once in SQL Editor) |
| `lib/supabase/admin.ts` | Service-role client (server-only) |
| `lib/supabase/server.ts` | Per-request user client |
| `lib/stripe.ts` | Stripe SDK singleton |
| `lib/email.ts` | Resend wrapper + admin ping |
| `lib/auth.ts` | `isAdmin()` gate |

---

## Troubleshooting

- **Form submit shows "Something broke"** → Vercel function logs:
  `vercel logs https://problemamvp.vercel.app` — look for the failing route.
  Most common cause: missing env var.
- **Magic link returns to `/login?error=…`** → check Supabase Auth → URL
  Configuration includes the exact redirect URL.
- **Admin dashboard 403** → your email isn't in `ADMIN_EMAILS`. Update the env
  var in Vercel, then `vercel --prod` to rebuild.
- **Stripe card form blank** → publishable key missing or wrong (live key
  in test webhook etc.). Browser console will show.
- **`pool_current_cents` doesn't update** → the trigger runs on `INSERT/UPDATE/DELETE`
  of `pledges`. If you edited a row in the Table Editor and it didn't update,
  re-run `SELECT public.recompute_pool('<case-uuid>');` in SQL Editor.
