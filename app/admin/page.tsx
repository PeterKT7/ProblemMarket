import { redirect } from 'next/navigation';
import { isAdmin, getCurrentUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { DecisionButtons } from './DecisionButtons';
import { CaseEditButton } from './CaseEditor';

export const dynamic = 'force-dynamic';

function money(cents: number | string | null | undefined) {
  const n = Number(cents ?? 0);
  if (n >= 100_000_000) return '$' + (n / 100_000_000).toFixed(1) + 'M';
  if (n >= 100_000) return '$' + (n / 100_000).toFixed(0) + 'K';
  return '$' + (n / 100).toLocaleString();
}

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/admin');
  if (!(await isAdmin())) {
    return (
      <main className="shell-narrow">
        <div className="mono">FORBIDDEN</div>
        <h1>You're signed in, but not an admin.</h1>
        <p>Add <code>{user.email}</code> to <code>ADMIN_EMAILS</code> in your Vercel env to get access.</p>
        <p><a href="/dashboard">→ Your dashboard</a></p>
      </main>
    );
  }

  const sb = supabaseAdmin();
  const [casesRes, intakeRes, solverRes, pledgesRes, waitlistRes, followsRes] = await Promise.all([
    sb.from('cases').select('id, case_no, title, one_liner, sponsor_label, brief_md, success_criteria_md, ruled_out_md, what_sponsors_provide_md, status, pool_target_cents, pool_current_cents, bounty_amount_cents, featured, deadline').order('case_no', { ascending: false }),
    sb.from('intake_submissions').select('id, full_name, organisation, email, estimated_value, status, created_at').order('created_at', { ascending: false }).limit(50),
    sb.from('solver_applications').select('id, full_name, email, primary_domain, entity_type, status, created_at').order('created_at', { ascending: false }).limit(50),
    sb.from('pledges').select('id, case_no_snapshot, pledger_name, pledger_email, pledger_org, amount_cents, status, stripe_payment_method_id, created_at').order('created_at', { ascending: false }).limit(100),
    sb.from('waitlist').select('id, email, kind, role, created_at').order('created_at', { ascending: false }).limit(50),
    sb.from('case_follows').select('id, email, source, created_at').order('created_at', { ascending: false }).limit(50),
  ]);

  const totals = {
    pledged_cents: (pledgesRes.data ?? []).filter((p: any) => p.status !== 'cancelled' && p.status !== 'refunded').reduce((s: number, p: any) => s + Number(p.amount_cents), 0),
    card_on_file_cents: (pledgesRes.data ?? []).filter((p: any) => p.status === 'card_on_file' || p.status === 'charged').reduce((s: number, p: any) => s + Number(p.amount_cents), 0),
    pledger_count: new Set((pledgesRes.data ?? []).map((p: any) => p.pledger_email)).size,
    new_intake: (intakeRes.data ?? []).filter((r: any) => r.status === 'new').length,
    new_solvers: (solverRes.data ?? []).filter((r: any) => r.status === 'pending').length,
  };

  return (
    <>
      <header className="topbar">
        <a className="brand" href="/">ProblemMarket — admin</a>
        <nav>
          <a href="/dashboard">My dashboard</a>
        </nav>
      </header>
      <main className="shell">
        <div className="mono">CONTROL ROOM</div>
        <h1>Docket</h1>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 32 }}>
          <Stat label="Pledged (intent)" value={money(totals.pledged_cents)} />
          <Stat label="Card on file" value={money(totals.card_on_file_cents)} />
          <Stat label="Unique pledgers" value={String(totals.pledger_count)} />
          <Stat label="Intake (new)" value={String(totals.new_intake)} />
          <Stat label="Solvers (pending)" value={String(totals.new_solvers)} />
        </div>

        <section>
          <h2>Cases</h2>
          <table>
            <thead><tr><th>Nº</th><th>Title</th><th>Status</th><th>Pool</th><th>Threshold</th><th>Bounty</th><th>Deadline</th><th></th><th></th></tr></thead>
            <tbody>
              {(casesRes.data ?? []).map((c: any) => {
                const pct = c.pool_target_cents > 0 ? Math.round((Number(c.pool_current_cents) / Number(c.pool_target_cents)) * 100) : 0;
                return (
                  <tr key={c.id}>
                    <td>{c.case_no}{c.featured ? ' ★' : ''}</td>
                    <td style={{ maxWidth: 420 }}>{c.title}</td>
                    <td><span className={`pill ${c.status}`}>{c.status}</span></td>
                    <td>{money(c.pool_current_cents)} <span style={{ color: 'var(--ink-soft)' }}>({pct}%)</span></td>
                    <td>{money(c.pool_target_cents)}</td>
                    <td>{money(c.bounty_amount_cents)}</td>
                    <td>{c.deadline ?? '—'}</td>
                    <td><a href={`/cases/${c.case_no}`} target="_blank" rel="noopener" style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', color: 'var(--signal)' }}>View ↗</a></td>
                    <td><CaseEditButton row={c} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section style={{ marginTop: 32 }}>
          <h2>Recent pledges</h2>
          <table>
            <thead><tr><th>When</th><th>Case</th><th>Pledger</th><th>Amount</th><th>Status</th><th>Card</th></tr></thead>
            <tbody>
              {(pledgesRes.data ?? []).map((p: any) => (
                <tr key={p.id}>
                  <td>{new Date(p.created_at).toLocaleString()}</td>
                  <td>{p.case_no_snapshot ?? '—'}</td>
                  <td>
                    <div>{p.pledger_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{p.pledger_email}{p.pledger_org ? ` · ${p.pledger_org}` : ''}</div>
                  </td>
                  <td>${(Number(p.amount_cents) / 100).toLocaleString()}</td>
                  <td><span className={`pill ${p.status}`}>{p.status}</span></td>
                  <td>{p.stripe_payment_method_id ? '✓' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section style={{ marginTop: 32 }}>
          <h2>Intake submissions</h2>
          <table>
            <thead><tr><th>When</th><th>Org</th><th>Contact</th><th>Value</th><th>Status</th><th>Decision</th></tr></thead>
            <tbody>
              {(intakeRes.data ?? []).map((r: any) => (
                <tr key={r.id}>
                  <td>{new Date(r.created_at).toLocaleString()}</td>
                  <td>{r.organisation}</td>
                  <td>{r.full_name}<br /><span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{r.email}</span></td>
                  <td>{r.estimated_value ?? '—'}</td>
                  <td><span className={`pill ${r.status}`}>{r.status}</span></td>
                  <td><DecisionButtons kind="intake" id={r.id} current={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section style={{ marginTop: 32 }}>
          <h2>Solver applications</h2>
          <table>
            <thead><tr><th>When</th><th>Name</th><th>Domain</th><th>Type</th><th>Status</th><th>Decision</th></tr></thead>
            <tbody>
              {(solverRes.data ?? []).map((r: any) => (
                <tr key={r.id}>
                  <td>{new Date(r.created_at).toLocaleString()}</td>
                  <td>{r.full_name}<br /><span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{r.email}</span></td>
                  <td>{r.primary_domain}</td>
                  <td>{r.entity_type}</td>
                  <td><span className={`pill ${r.status}`}>{r.status}</span></td>
                  <td><DecisionButtons kind="solver" id={r.id} current={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section style={{ marginTop: 32 }}>
          <h2>Email captures</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <h3>Waitlist / careers</h3>
              <table>
                <thead><tr><th>When</th><th>Email</th><th>Kind</th><th>Role</th></tr></thead>
                <tbody>
                  {(waitlistRes.data ?? []).map((r: any) => (
                    <tr key={r.id}><td>{new Date(r.created_at).toLocaleDateString()}</td><td>{r.email}</td><td>{r.kind}</td><td>{r.role ?? '—'}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <h3>Case follows</h3>
              <table>
                <thead><tr><th>When</th><th>Email</th><th>Source</th></tr></thead>
                <tbody>
                  {(followsRes.data ?? []).map((r: any) => (
                    <tr key={r.id}><td>{new Date(r.created_at).toLocaleDateString()}</td><td>{r.email}</td><td>{r.source ?? '—'}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <div className="mono">{label}</div>
      <div style={{ fontFamily: 'Fraunces, serif', fontSize: 28, marginTop: 4 }}>{value}</div>
    </div>
  );
}
