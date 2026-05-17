import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { clientIp, rateLimit } from './rate-limit';

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

export function tooMany() {
  return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
}

export function serverError(e: unknown) {
  const msg = e instanceof Error ? e.message : 'internal_error';
  console.error('[api error]', e);
  return NextResponse.json({ error: msg }, { status: 500 });
}

export function ok<T>(data: T) {
  return NextResponse.json({ ok: true, ...((data as object) ?? {}) });
}

// Wrap a handler with: rate-limit + zod-friendly error handling + IP/UA capture.
export function captureRequestMeta(req: Request) {
  return {
    ip_address: clientIp(req),
    user_agent: req.headers.get('user-agent') ?? null,
  };
}

export function handleZod(e: unknown) {
  if (e instanceof ZodError) {
    return badRequest('validation_failed', e.flatten());
  }
  return serverError(e);
}

export function gateRateLimit(req: Request, scope: string) {
  return rateLimit(req, scope) ? null : tooMany();
}
