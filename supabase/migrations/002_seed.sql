-- Seed the docket with the 8 cases currently hand-rolled in index.html so the
-- API has something to query immediately. Idempotent: re-running won't duplicate.

insert into public.cases (case_no, slug, title, sponsor_label, one_liner,
  bounty_amount_cents, pool_target_cents, deadline, status, featured, published_at)
values
  ('042', 'fda-biological-ageing-endpoint',
   'A regulatory pathway that lets ageing itself be the trial endpoint, not a downstream disease.',
   'Hevolution Foundation', 'pre-registered FDA-track deliverable',
   1400000000, 1200000000, '2027-04-08', 'open', true, now()),
  ('043', 'sub-second-bedside-sepsis-stratification',
   'Sub-second bedside stratification of sepsis subtype before antibiotic choice.',
   'Three teaching-hospital systems', 'EHR-grade reference implementation',
   780000000, 600000000, '2026-11-30', 'open', false, now()),
  ('044', 'closed-loop-mrv-for-direct-air-capture',
   'Closed-loop MRV for direct air capture below $40/ton with field-replicable hardware.',
   'A consortium of three buyers', '24-month deployment commitment',
   930000000, 750000000, '2027-02-15', 'open', false, now()),
  ('045', 'pre-trial-recidivism-prediction-equity',
   'A pre-trial recidivism prediction model that survives adversarial audit on race and class.',
   'Criminal Justice Reform Fund',
   'benchmarked against UK, US, and Australia; policy-level deliverable',
   520000000, 400000000, '2026-09-20', 'funded', false, now()),
  ('046', 'civil-engineering-design-review-llm',
   'A civil-engineering design-review LLM that catches load-path errors a senior PE would catch.',
   'Two state DOTs + a private GC', 'must clear blinded review by 12 senior PEs',
   410000000, 320000000, '2026-10-12', 'open', false, now()),
  ('047', 'high-density-housing-permitting-time',
   'A permitting-time reduction protocol for high-density housing that survives political change.',
   'Three west-coast city governments', 'pilot in two jurisdictions',
   680000000, 500000000, '2027-01-30', 'open', false, now()),
  ('048', 'verifiable-on-chain-identity-no-pii',
   'A verifiable on-chain identity primitive that doesn''t leak PII or require a central issuer.',
   'A fintech-bank consortium', 'production-grade reference + audit',
   1100000000, 900000000, '2027-03-22', 'dispatched', false, now()),
  ('049', 'low-cost-cold-chain-mrna',
   'A low-cost cold-chain alternative for mRNA logistics in low-grid regions.',
   'A vaccine alliance', '12-month field trial in 2 countries',
   590000000, 460000000, '2026-12-05', 'open', false, now())
on conflict (case_no) do nothing;

-- The featured case (042) starts with $9.1M pledged in the UI; mirror that.
update public.cases
   set pool_current_cents = 910000000
 where case_no = '042' and pool_current_cents = 0;
