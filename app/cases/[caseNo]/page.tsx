import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

// Shareable per-case page. The whole GTM motion depends on having a URL we
// can drop in a cold email: "I built this for you → /cases/042". The static
// homepage is great context but isn't dropable; this is.

function money(cents: number | string | null | undefined) {
  const n = Number(cents ?? 0);
  if (n >= 100_000_000) return '$' + (n / 100_000_000).toFixed(1) + 'M';
  if (n >= 100_000) return '$' + (n / 100_000).toFixed(0) + 'K';
  return '$' + (n / 100).toLocaleString();
}

async function load(caseNo: string) {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from('cases')
    .select('id, case_no, slug, title, sponsor_label, one_liner, brief_md, success_criteria_md, ruled_out_md, what_sponsors_provide_md, bounty_amount_cents, pool_target_cents, pool_current_cents, platform_fee_bps, deadline, status, panel')
    .eq('case_no', caseNo)
    .neq('status', 'draft')
    .maybeSingle();
  return data as any;
}

export async function generateMetadata({ params }: { params: Promise<{ caseNo: string }> }): Promise<Metadata> {
  const { caseNo } = await params;
  const c = await load(caseNo);
  if (!c) return { title: `Case ${caseNo} — ProblemMarket` };
  return {
    title: `Case ${c.case_no}: ${c.title} — ProblemMarket`,
    description: c.one_liner ?? c.title,
    openGraph: {
      title: `Case ${c.case_no}: ${c.title}`,
      description: c.one_liner ?? c.title,
      url: `/cases/${c.case_no}`,
    },
  };
}

export default async function CasePage({ params }: { params: Promise<{ caseNo: string }> }) {
  const { caseNo } = await params;
  const c = await load(caseNo);
  if (!c) notFound();

  const poolPct = c.pool_target_cents > 0
    ? Math.min(100, Math.round((Number(c.pool_current_cents) / Number(c.pool_target_cents)) * 100))
    : 0;
  const feePct = ((c.platform_fee_bps ?? 400) / 100).toFixed(c.platform_fee_bps % 100 === 0 ? 0 : 1);

  return (
    <>
      {/* Re-use the marketing site's stylesheet so case pages match the brand
          without us re-implementing every utility class. */}
      <link rel="stylesheet" href="/styles.css" />

      <header style={{ borderBottom: '1px solid var(--rule)', padding: '20px 32px' }}>
        <a href="/" style={{ color: 'var(--ink)', fontFamily: 'Fraunces, serif', fontSize: 20, textDecoration: 'none' }}>
          ← ProblemMarket
        </a>
      </header>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '64px 32px 96px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
          <span className="mono" style={{ background: 'var(--ink)', color: 'var(--paper)', padding: '4px 12px' }}>
            CASE Nº {c.case_no}
          </span>
          <span className={`pill ${c.status}`} style={{ textTransform: 'uppercase' }}>{c.status}</span>
        </div>

        <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 44, lineHeight: 1.1, margin: '0 0 16px', fontWeight: 400, letterSpacing: '-0.01em' }}>
          {c.title}
        </h1>

        {c.one_liner && (
          <p style={{ fontSize: 19, color: 'var(--ink-soft)', fontStyle: 'italic', marginBottom: 32 }}>
            {c.one_liner}
          </p>
        )}

        {c.sponsor_label && (
          <div style={{ marginBottom: 40, paddingBottom: 24, borderBottom: '1px solid var(--rule)' }}>
            <div className="mono" style={{ marginBottom: 4 }}>SPONSOR</div>
            <div style={{ fontSize: 17 }}>{c.sponsor_label}</div>
          </div>
        )}

        <section style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 48, marginBottom: 48 }}>
          <div>
            <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 22, marginBottom: 12, fontWeight: 400 }}>The bounty</h2>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 48, lineHeight: 1, marginBottom: 8 }}>
              {money(c.bounty_amount_cents)}
            </div>
            <p style={{ fontSize: 14, color: 'var(--ink-soft)' }}>
              Awarded on adjudication. {feePct}% platform fee. Winning solver receives the balance.
            </p>
          </div>

          <div>
            <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 22, marginBottom: 12, fontWeight: 400 }}>Pool status</h2>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14, color: 'var(--ink-soft)' }}>
              <span>{money(c.pool_current_cents)} pledged</span>
              <span>of {money(c.pool_target_cents)}</span>
            </div>
            <div style={{ height: 8, background: 'var(--rule)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${poolPct}%`, background: 'var(--signal)' }} />
            </div>
            <p style={{ marginTop: 12, fontSize: 14, color: 'var(--ink-soft)' }}>
              {poolPct}% to activation threshold {c.deadline ? `· deadline ${c.deadline}` : ''}.
              Pledges are intent-only until the threshold is crossed.
            </p>
          </div>
        </section>

        {c.brief_md && (
          <Block title="The brief">
            <MD text={c.brief_md} />
          </Block>
        )}

        {c.success_criteria_md && (
          <Block title="Success criteria">
            <MD text={c.success_criteria_md} />
          </Block>
        )}

        {c.ruled_out_md && (
          <Block title="What's been ruled out">
            <MD text={c.ruled_out_md} />
          </Block>
        )}

        {c.what_sponsors_provide_md && (
          <Block title="What sponsors provide">
            <MD text={c.what_sponsors_provide_md} />
          </Block>
        )}

        <div style={{ marginTop: 48, padding: 32, background: 'var(--paper)', border: '1px solid var(--rule)' }}>
          <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 24, marginTop: 0, fontWeight: 400 }}>
            Pledge to this case
          </h2>
          <p style={{ marginBottom: 24, color: 'var(--ink-soft)' }}>
            Co-fund the bounty. Pledges are refundable until the activation
            threshold is met — if the pool fails, you receive your capital back
            plus a 6% bonus on your committed amount.
          </p>
          <a href={`/?pledge=${c.case_no}#docket`} className="btn" style={{ background: 'var(--ink)', color: 'var(--paper)', padding: '12px 24px', textDecoration: 'none', display: 'inline-block', marginRight: 12 }}>
            Pledge to Case {c.case_no} →
          </a>
          <a href="/#docket" style={{ color: 'var(--signal)', fontSize: 14 }}>
            ← All cases
          </a>
        </div>
      </main>
    </>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 40, paddingTop: 24, borderTop: '1px solid var(--rule)' }}>
      <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 26, marginBottom: 12, fontWeight: 400 }}>{title}</h2>
      <div style={{ fontSize: 17, lineHeight: 1.6 }}>{children}</div>
    </section>
  );
}

// Intentionally minimal markdown — paragraphs only. We don't need a heavy MD
// library for the first cases; copy them as plain prose in Supabase.
function MD({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n{2,}/).map((p, i) => (
        <p key={i} style={{ marginBottom: 14 }}>{p}</p>
      ))}
    </>
  );
}
