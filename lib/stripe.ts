import Stripe from 'stripe';
import { env } from './env';

let cached: Stripe | null = null;

export function stripe() {
  if (cached) return cached;
  // Pin to whatever the installed SDK ships as default; explicit pinning
  // breaks on minor SDK bumps and we don't depend on version-specific fields.
  cached = new Stripe(env.stripeSecret(), {
    appInfo: { name: 'ProblemMarket', version: '0.2.0' },
  });
  return cached;
}
