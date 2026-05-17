// Centralized env access. Throwing here surfaces missing config at boot
// instead of as a confusing 500 in a request handler.

function need(key: string): string {
  const v = process.env[key];
  if (!v || v.length === 0) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return v;
}

function optional(key: string): string | undefined {
  const v = process.env[key];
  return v && v.length > 0 ? v : undefined;
}

export const env = {
  supabaseUrl: () => need('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: () => need('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  supabaseServiceKey: () => need('SUPABASE_SERVICE_ROLE_KEY'),

  stripeSecret: () => need('STRIPE_SECRET_KEY'),
  stripePublishable: () => need('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'),
  stripeWebhookSecret: () => optional('STRIPE_WEBHOOK_SECRET'),

  resendKey: () => optional('RESEND_API_KEY'),
  resendFrom: () => process.env.RESEND_FROM ?? 'ProblemMarket <hello@problemamvp.vercel.app>',

  siteUrl: () => process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',

  adminEmails: () =>
    (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
};
