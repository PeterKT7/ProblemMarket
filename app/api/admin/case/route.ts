import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { handleZod, ok, serverError } from '@/lib/api';

export const runtime = 'nodejs';

// Allow editing the user-facing copy + the operational knobs without touching
// generated fields (id, case_no, slug, pool_current_cents, audit timestamps).
const schema = z.object({
  id: z.string().uuid(),
  patch: z.object({
    title: z.string().min(3).max(500).optional(),
    one_liner: z.string().max(500).nullable().optional(),
    sponsor_label: z.string().max(500).nullable().optional(),
    brief_md: z.string().max(20000).nullable().optional(),
    success_criteria_md: z.string().max(10000).nullable().optional(),
    ruled_out_md: z.string().max(10000).nullable().optional(),
    what_sponsors_provide_md: z.string().max(10000).nullable().optional(),
    bounty_amount_cents: z.number().int().min(0).max(100_000_000_000).optional(),
    pool_target_cents: z.number().int().min(0).max(100_000_000_000).optional(),
    deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    status: z.enum(['draft', 'open', 'funded', 'dispatched', 'adjudicated', 'refunded', 'cancelled']).optional(),
    featured: z.boolean().optional(),
  }),
});

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const me = await getCurrentUser();

  try {
    const { id, patch } = schema.parse(await req.json());
    const sb = supabaseAdmin();

    const { data, error } = await sb
      .from('cases')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, case_no')
      .single();

    if (error) throw error;

    await sb.from('audit_log').insert({
      actor_user_id: me?.id ?? null,
      actor_email: me?.email ?? null,
      action: 'case.update',
      entity_type: 'case',
      entity_id: id,
      diff: patch,
    });

    return ok({ case_no: (data as any).case_no });
  } catch (e) {
    return e instanceof Error && e.message.includes('ZodError') ? handleZod(e) : serverError(e);
  }
}
