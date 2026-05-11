/// <reference types="./stripe.d.ts" />
// MODIFIED for BizRethink (overlay 045): late-binding Stripe SDK singleton.
//
// Previously this module exported a `const stripe = new Stripe(env(...))`
// fixed at module load. With the new DB-backed admin-UI Stripe config
// (BizrethinkInstanceStripeConfig — sandbox/live credentials + master
// billing toggle), admins can change credentials and switch modes at
// runtime without a redeploy. To make 25+ existing
// `import { stripe } from '@documenso/lib/server-only/stripe'` call sites
// pick up the new credentials without code changes, we rely on
// ES-module-spec **live bindings**: `export let stripe` reassigned in
// `ensureStripeClient()` is visible to all importers.
//
// Bootstrap path: module load still reads the env var so the binding has
// a usable Stripe instance before the DB is queried (boot ordering,
// migration-in-flight cases). First DB-aware call to `ensureStripeClient()`
// reassigns the binding with the active mode's credentials.
//
// Cache eviction: when admin saves new credentials or switches mode, the
// TRPC mutation calls `invalidateStripeClient()` which reassigns the
// binding. The next caller transparently gets the new SDK instance.
import {
  getInstanceStripeConfig,
  invalidateStripeConfig,
} from '@bizrethink/customizations/server-only/instance-stripe-config';
import Stripe from 'stripe';

import { env } from '../../utils/env';

const STRIPE_API_VERSION = '2022-11-15' as const;

function buildClient(apiKey: string): Stripe {
  return new Stripe(apiKey, {
    apiVersion: STRIPE_API_VERSION,
    typescript: true,
  });
}

// Bootstrap synchronously with the env var so importers always have a
// usable client at import time. ESM live-binding lets us reassign this
// later; importers re-read the binding on every access.
export let stripe: Stripe = buildClient(env('NEXT_PRIVATE_STRIPE_API_KEY') ?? '');

// Track which credential set the current `stripe` instance was built from.
// 'env' means "bootstrap, no DB row consulted yet"; 'sandbox' | 'live' track
// the active DB mode. Used to decide whether `ensureStripeClient()` needs
// to rebuild on next call.
let currentSource: 'env' | 'sandbox' | 'live' = 'env';

const setStripe = (next: Stripe) => {
  stripe = next;
};
const setCurrentSource = (next: 'env' | 'sandbox' | 'live') => {
  currentSource = next;
};

/**
 * Ensure the exported `stripe` binding reflects the latest credentials
 * from the DB (or the env fallback if no DB row exists). Cheap on
 * subsequent calls: rebuilds the SDK only when the active credential
 * source has changed.
 *
 * Callers that need to GUARANTEE they're using the latest credentials
 * (e.g., the webhook handler after a "Save credentials" admin action)
 * should `await ensureStripeClient()` before reading the binding.
 *
 * Most internal callers don't need to await this — they import `stripe`
 * directly and the live binding gives them whatever was most recently
 * assigned. The TRPC mutation that updates credentials triggers a
 * rebuild via `invalidateStripeClient()` before returning, so by the
 * time the admin gets a "saved" toast, the binding is current.
 */
export const ensureStripeClient = async (): Promise<Stripe> => {
  const config = await getInstanceStripeConfig();
  const desiredSource: 'env' | 'sandbox' | 'live' = config?.mode ?? 'env';

  if (desiredSource === currentSource && stripe) {
    return stripe;
  }

  const apiKey = config?.apiKey ?? env('NEXT_PRIVATE_STRIPE_API_KEY') ?? '';
  setStripe(buildClient(apiKey));
  setCurrentSource(desiredSource);
  return stripe;
};

/**
 * Drop the cached Stripe config + rebuild the SDK singleton. Call this
 * after writing new credentials or switching modes via the admin UI.
 *
 * Idempotent — safe to call even when nothing has changed (just costs
 * one DB read + one `new Stripe()` call).
 */
export const invalidateStripeClient = async (): Promise<void> => {
  invalidateStripeConfig();
  setCurrentSource('env'); // force re-resolution
  await ensureStripeClient();
};

// Auto-warm the binding at startup so the first request after deploy
// reads from the DB. Best-effort: if the DB isn't reachable during early
// boot (migration in flight, network blip), we keep the env-based
// bootstrap and try again on the next explicit `ensureStripeClient()`
// call.
ensureStripeClient().catch(() => {
  // Intentional: bootstrap fallback is fine. Errors logged here would
  // confuse fresh-deploy users who haven't configured Stripe yet.
});

export { Stripe };
