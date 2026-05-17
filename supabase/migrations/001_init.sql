-- ProblemMarket initial schema.
--
-- Design notes:
--   * Everything is append-only-friendly. We never delete pledges or applications;
--     status transitions move them through a state machine.
--   * `profiles` mirrors auth.users so app code never has to join into the auth schema.
--   * RLS is on for every table. Anonymous writes are funneled through SECURITY
--     DEFINER RPCs (or the service-role key in /api routes) — the anon key alone
--     can't touch sensitive columns.
--   * `cases` carries everything the homepage and brief modal render so we can move
--     the docket out of index.html and into the DB without changing the design.

-- =====================================================================
-- profiles: one row per authenticated user
-- =====================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  organisation text,
  role text not null default 'sponsor' check (role in ('sponsor','solver','admin')),
  stripe_customer_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- cases: the docket
-- =====================================================================
create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  case_no text unique not null,                   -- e.g. "042"
  slug text unique not null,                      -- e.g. "fda-biological-ageing-endpoint"
  title text not null,
  sponsor_label text,                              -- displayed sponsor (may be anonymized)
  sponsor_user_id uuid references public.profiles(id) on delete set null,
  one_liner text,                                  -- card subtitle
  brief_md text,                                   -- full case brief (markdown)
  success_criteria_md text,
  ruled_out_md text,
  what_sponsors_provide_md text,

  bounty_amount_cents bigint not null default 0,  -- target bounty (e.g. $14M = 1400000000)
  pool_target_cents bigint not null default 0,    -- DAC activation threshold
  pool_current_cents bigint not null default 0,   -- materialized; updated by trigger on pledges
  platform_fee_bps int not null default 400,      -- 4% default
  deadline date,

  status text not null default 'draft' check (status in ('draft','open','funded','dispatched','adjudicated','refunded','cancelled')),
  featured boolean not null default false,
  panel jsonb,                                     -- [{name, affiliation}]
  metadata jsonb not null default '{}'::jsonb,

  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cases_status_idx on public.cases(status);
create index if not exists cases_featured_idx on public.cases(featured) where featured;

-- =====================================================================
-- pledges: intent capture (DAC). No money moves until status='charged'.
-- =====================================================================
create table if not exists public.pledges (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.cases(id) on delete set null,
  case_no_snapshot text,                           -- denormalized for orphan handling

  user_id uuid references public.profiles(id) on delete set null,
  pledger_name text not null,
  pledger_email text not null,
  pledger_org text,

  amount_cents bigint not null check (amount_cents > 0),

  -- Stripe (filled in when card-on-file flow completes; null = intent only)
  stripe_customer_id text,
  stripe_setup_intent_id text,
  stripe_payment_method_id text,

  status text not null default 'pending'
    check (status in ('pending','card_on_file','charged','refunded','cancelled','failed')),

  charge_id text,                                  -- stripe PaymentIntent when charged
  charged_at timestamptz,
  refunded_at timestamptz,

  ip_address inet,
  user_agent text,
  utm jsonb,                                       -- {source, medium, campaign}
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pledges_case_id_idx on public.pledges(case_id);
create index if not exists pledges_status_idx on public.pledges(status);
create index if not exists pledges_email_idx on public.pledges(pledger_email);

-- Roll up active pledges into cases.pool_current_cents so the homepage doesn't
-- need to aggregate on every render.
create or replace function public.recompute_pool(target_case uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.cases
     set pool_current_cents = coalesce((
           select sum(amount_cents)
             from public.pledges
            where case_id = target_case
              and status in ('pending','card_on_file','charged')
         ), 0),
         updated_at = now()
   where id = target_case;
end; $$;

create or replace function public.pledges_pool_trigger()
returns trigger language plpgsql as $$
begin
  if (TG_OP = 'DELETE') then
    perform public.recompute_pool(OLD.case_id);
    return OLD;
  else
    perform public.recompute_pool(NEW.case_id);
    if (TG_OP = 'UPDATE' and OLD.case_id is distinct from NEW.case_id and OLD.case_id is not null) then
      perform public.recompute_pool(OLD.case_id);
    end if;
    return NEW;
  end if;
end; $$;

drop trigger if exists pledges_pool_aiud on public.pledges;
create trigger pledges_pool_aiud
  after insert or update or delete on public.pledges
  for each row execute function public.pledges_pool_trigger();

-- =====================================================================
-- solver_applications: people asking for solver access
-- =====================================================================
create table if not exists public.solver_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  full_name text not null,
  email text not null,
  primary_domain text not null,
  entity_type text not null check (entity_type in ('individual','syndicate','lab')),
  credentials_md text not null,
  links jsonb,                                     -- [{label, url}]
  status text not null default 'pending'
    check (status in ('pending','approved','rejected','waitlisted')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  ip_address inet,
  user_agent text,
  utm jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists solver_apps_status_idx on public.solver_applications(status);
create index if not exists solver_apps_email_idx on public.solver_applications(email);

-- =====================================================================
-- intake_submissions: companies asking us to host their problem
-- =====================================================================
create table if not exists public.intake_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  full_name text not null,
  organisation text not null,
  email text not null,
  problem_statement text not null,
  estimated_value text,
  status text not null default 'new'
    check (status in ('new','interviewing','accepted','revise','declined')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  promoted_case_id uuid references public.cases(id) on delete set null,
  ip_address inet,
  user_agent text,
  utm jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists intake_status_idx on public.intake_submissions(status);

-- =====================================================================
-- case_follows: lightweight email-only "notify me" capture
-- =====================================================================
create table if not exists public.case_follows (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.cases(id) on delete cascade,
  email text not null,
  source text,                                     -- which form, e.g. "case-modal-042"
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now(),
  unique (case_id, email)
);

-- =====================================================================
-- waitlist: email capture from the launch waitlist + careers
-- =====================================================================
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  kind text not null default 'launch' check (kind in ('launch','careers','press','general')),
  role text,                                       -- for careers: which role they applied for
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now(),
  unique (email, kind, role)
);

-- =====================================================================
-- audit_log: append-only record of admin actions
-- =====================================================================
create table if not exists public.audit_log (
  id bigserial primary key,
  actor_user_id uuid references public.profiles(id) on delete set null,
  actor_email text,
  action text not null,
  entity_type text,
  entity_id uuid,
  diff jsonb,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.cases enable row level security;
alter table public.pledges enable row level security;
alter table public.solver_applications enable row level security;
alter table public.intake_submissions enable row level security;
alter table public.case_follows enable row level security;
alter table public.waitlist enable row level security;
alter table public.audit_log enable row level security;

-- profiles: a user can read/update their own row; admins can read all.
drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
  for update using (auth.uid() = id);

-- cases: anyone (including anon) can read non-draft cases.
drop policy if exists "cases public read" on public.cases;
create policy "cases public read" on public.cases
  for select using (status <> 'draft');

-- pledges: a logged-in user can read their own pledges.
drop policy if exists "pledges self read" on public.pledges;
create policy "pledges self read" on public.pledges
  for select using (auth.uid() = user_id);

-- solver_applications: self read.
drop policy if exists "solver_apps self read" on public.solver_applications;
create policy "solver_apps self read" on public.solver_applications
  for select using (auth.uid() = user_id);

-- intake_submissions: self read.
drop policy if exists "intake self read" on public.intake_submissions;
create policy "intake self read" on public.intake_submissions
  for select using (auth.uid() = user_id);

-- All writes from forms go through /api routes using the service-role key,
-- which bypasses RLS. We deliberately do NOT grant anon insert here — that
-- forces all submissions through the API so we can validate, rate-limit,
-- and capture IP / UA server-side.
