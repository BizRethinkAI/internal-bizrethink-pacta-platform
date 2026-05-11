import type Stripe from 'stripe';

// Phase K (TRPC bizrethink.instanceStripe.syncProducts):
// Idempotent Pacta SaaS product+price setup against the active Stripe
// account. Server-side equivalent of `scripts/bizrethink-stripe-setup.mjs`
// — the script remains for one-shot CLI use (fresh prod bootstrap,
// switching to live mode); this version is what the admin UI's
// "Sync Pacta products" button calls.
//
// Idempotency: products are looked up by `metadata.claimId` (matching
// INTERNAL_CLAIM_ID enum values). Existing products are updated in place.
// Prices are matched by recurring interval; same-amount prices are
// reused unchanged; amount-changed prices trigger archive-old-create-new
// (Stripe disallows mutating Price.unit_amount).
//
// Tier definitions MUST match packages/lib/types/subscription.ts
// internalClaims record. claimId values are EXACT INTERNAL_CLAIM_ID
// enum string values ('pro', 'business'). If you change tier numbers
// here, update the script too — both should agree.

export type StripeTierSpec = {
  claimId: 'pro' | 'business';
  name: string;
  description: string;
  monthly: { amountCents: number; currency: string };
  yearly: { amountCents: number; currency: string };
};

// Hard-coded tiers — must match the approved pricing in
// ~/.claude/projects/.../memory/pacta_usp_and_pricing.md.
const TIERS: StripeTierSpec[] = [
  {
    claimId: 'pro',
    name: 'Pacta Pro',
    description:
      '100 documents per month · 5 team members · branded signing · AI-assisted contract drafting · webhook events',
    monthly: { amountCents: 3500, currency: 'usd' },
    yearly: { amountCents: 35000, currency: 'usd' },
  },
  {
    claimId: 'business',
    name: 'Pacta Business',
    description:
      'Unlimited documents · 10 team members ($20/seat over) · CFR21 + HIPAA · embedded signing · full AI features · priority support',
    monthly: { amountCents: 19900, currency: 'usd' },
    yearly: { amountCents: 199000, currency: 'usd' },
  },
];

export type SyncResult = {
  tier: StripeTierSpec['claimId'];
  productId: string;
  monthlyPriceId: string;
  yearlyPriceId: string;
  created: { product: boolean; monthly: boolean; yearly: boolean };
};

/**
 * Run the idempotent setup against an authenticated Stripe client.
 *
 * The caller supplies the client — typically the TRPC mutation passes
 * the live-binding singleton from `@documenso/lib/server-only/stripe`
 * after calling `ensureStripeClient()`. This avoids building a second
 * SDK instance for the sync.
 *
 * Returns one entry per tier with the resolved product + price IDs
 * (whether newly created or re-used). The `created` sub-object tells
 * the admin UI whether to say "Created Pro Pro tier" vs "Pro tier
 * already exists, verified."
 */
export async function syncStripeProducts(client: Stripe): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  for (const tier of TIERS) {
    const product = await upsertProduct(client, tier);
    const monthlyPrice = await upsertPrice(client, product.id, 'month', tier.monthly);
    const yearlyPrice = await upsertPrice(client, product.id, 'year', tier.yearly);

    results.push({
      tier: tier.claimId,
      productId: product.id,
      monthlyPriceId: monthlyPrice.priceId,
      yearlyPriceId: yearlyPrice.priceId,
      created: {
        product: product.created,
        monthly: monthlyPrice.created,
        yearly: yearlyPrice.created,
      },
    });
  }

  return results;
}

async function upsertProduct(
  client: Stripe,
  tier: StripeTierSpec,
): Promise<{ id: string; created: boolean }> {
  const search = await client.products.search({
    query: `metadata['claimId']:'${tier.claimId}' AND active:'true'`,
  });

  if (search.data.length > 0) {
    const existing = search.data[0];

    const needsUpdate =
      existing.name !== tier.name ||
      existing.description !== tier.description ||
      existing.metadata.claimId !== tier.claimId;

    if (needsUpdate) {
      await client.products.update(existing.id, {
        name: tier.name,
        description: tier.description,
        metadata: { claimId: tier.claimId },
      });
    }

    return { id: existing.id, created: false };
  }

  const fresh = await client.products.create({
    name: tier.name,
    description: tier.description,
    metadata: { claimId: tier.claimId },
  });

  return { id: fresh.id, created: true };
}

async function upsertPrice(
  client: Stripe,
  productId: string,
  interval: 'month' | 'year',
  spec: { amountCents: number; currency: string },
): Promise<{ priceId: string; created: boolean }> {
  const list = await client.prices.list({
    product: productId,
    active: true,
    limit: 100,
  });

  const existing = list.data.find((p) => p.recurring?.interval === interval);

  if (existing) {
    const isCorrectShape =
      existing.unit_amount === spec.amountCents &&
      existing.currency === spec.currency &&
      existing.metadata.visibleInApp === 'true';

    if (isCorrectShape) {
      return { priceId: existing.id, created: false };
    }

    // Amount/metadata drift — archive old, create new. Stripe disallows
    // editing Price.unit_amount on existing prices.
    await client.prices.update(existing.id, { active: false });
  }

  const created = await client.prices.create({
    product: productId,
    currency: spec.currency,
    unit_amount: spec.amountCents,
    recurring: { interval },
    tax_behavior: 'exclusive',
    metadata: { visibleInApp: 'true' },
  });

  return { priceId: created.id, created: true };
}
