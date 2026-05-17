import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { captureRequestMeta, gateRateLimit, handleZod, ok } from '@/lib/api';
import { notifyAdmin } from '@/lib/email';

export const runtime = 'nodejs';

const waitlistSchema = z.object({
  email: z.string().email().max(200),
  kind: z.enum(['launch', 'careers', 'press', 'general']).default('launch'),
  role: z.string().max(100).optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(req: Request) {
  const limited = gateRateLimit(req, 'waitlist');
  if (limited) return limited;

  try {
    const body = await req.json();
    const data = waitlistSchema.parse(body);
    const meta = captureRequestMeta(req);

    const { error } = await supabaseAdmin()
      .from('waitlist')
      .upsert(
        {
          email: data.email,
          kind: data.kind,
          role: data.role ?? null,
          metadata: data.metadata ?? {},
          ip_address: meta.ip_address,
          user_agent: meta.user_agent,
        },
        { onConflict: 'email,kind,role', ignoreDuplicates: true },
      );

    if (error) throw error;

    if (data.kind === 'careers') {
      void notifyAdmin(`Careers — ${data.role ?? 'General'}`, `<p>${data.email} applied for ${data.role ?? 'General'}.</p>`);
    }

    return ok({});
  } catch (e) {
    return handleZod(e);
  }
}
