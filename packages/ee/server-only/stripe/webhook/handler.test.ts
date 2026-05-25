import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Overlay 045b regression guard: BizRethink Stripe webhook handler reads
 * webhook secret + billing-enabled flag from the DB-backed
 * BizrethinkInstanceStripeConfig (with env fallback). Per MERGE-MANIFEST
 * §3, this is a HIGH-risk surface: a regression would silently fall back
 * to env-only mode, breaking the admin sandbox↔live switching feature.
 *
 * Source-presence guard. Full Stripe-webhook-signature integration test
 * deferred (would need stripe webhook construction + crypto mocking).
 */
const SOURCE = readFileSync(
  join(__dirname, 'handler.ts'),
  'utf-8',
);

describe('stripe/webhook/handler — overlay 045b DB-backed config regression guard', () => {
  it('source imports from bizrethink instance-stripe-config', () => {
    expect(SOURCE).toMatch(/@bizrethink\/customizations\/server-only\/instance-stripe-config/);
  });

  it('source contains the overlay 045b marker comment', () => {
    expect(SOURCE).toMatch(/overlay 045b/);
  });

  it('source still calls stripe.webhooks.constructEvent (signature verification)', () => {
    // Regression guard: if the verification step is silently removed, this
    // assertion fails and stops the merge.
    expect(SOURCE).toMatch(/stripe\.webhooks\.constructEvent|constructEvent/);
  });
});
