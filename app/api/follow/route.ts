import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { captureRequestMeta, gateRateLimit, handleZod, ok } from '@/lib/api';

export const runtime = 'nodejs';

const followSchema = z.object({
  email: z.string().email().max(200),
  case_no: z.string().max(20).optional(),
  source: z.string().max(100).optional(),
});

export async function POST(req: Request) {
  const limited = gateRateLimit(req, 'follow');
  if (limited) return limited;

  try {
    const body = await req.json();
    const data = followSchema.parse(body);
    const meta = captureRequestMeta(req);
    const sb = supabaseAdmin();

    let caseId: string | null = null;
    if (data.case_no) {
      const { data: c } = await sb.from('cases').select('id').eq('case_no', data.case_no).single();
      if (c) caseId = c.id as string;
    }

    // ON CONFLICT DO NOTHING via upsert with ignoreDuplicates.
    const { error } = await sb
      .from('case_follows')
      .upsert(
        {
          case_id: caseId,
          email: data.email,
          source: data.source ?? null,
          ip_address: meta.ip_address,
          user_agent: meta.user_agent,
        },
        { onConflict: 'case_id,email', ignoreDuplicates: true },
      );

    if (error) throw error;
    return ok({});
  } catch (e) {
    return handleZod(e);
  }
}
