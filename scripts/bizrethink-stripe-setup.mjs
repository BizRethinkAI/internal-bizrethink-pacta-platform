#!/usr/bin/env node

/**
 * bizrethink-stripe-setup.mjs — Idempotent Stripe Products + Prices setup.
 *
 * Creates the Pacta SaaS tier products in Stripe with the exact metadata
 * the platform code expects:
 *
 *   - PRODUCT metadata.claimId = "pro" | "business"
 *     (consumed by packages/ee/server-only/stripe/get-internal-claim-plans.ts;
 *      products without a matching claimId are silently skipped in plan list)
 *
 *   - PRICE metadata.visibleInApp = "true"
 *     (consumed by the same plan-list code; prices without this flag are
 *      filtered out of the public billing UI)
 *
 * Idempotent: re-running is safe. Products are looked up by claimId metadata;
 * existing products are updated in place. Prices are looked up by recurring
 * interval; if the amount changed, the old price is archived and a new one
 * created (Stripe doesn't allow price-amount edits).
 *
 * USAGE:
 *   $ node scripts/bizrethink-stripe-setup.mjs
 *
 * SETUP:
 *   1. Stripe dashboard (sandbox) -> Developers -> API keys
 *      Copy the test secret key (sk_test_...)
 *   2. Save it to scripts/.creds.env (gitignored):
 *        echo 'export STRIPE_API_KEY="sk_test_..."' >> scripts/.creds.env
 *   3. Run the script
 *
 * The script prints a copy-paste block at the end with every env var you
 * need to set in Coolify.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

// ─── Tier definitions (must match packages/lib/types/subscription.ts) ─────
// claimId values are EXACT INTERNAL_CLAIM_ID enum string values.
// Amounts are in cents (Stripe's smallest unit for USD).
const TIERS = [
  {
    claimId: 'pro',
    name: 'Pacta Pro',
    description:
      '100 documents per month · 5 team members · branded signing · AI-assisted contract drafting · webhook events',
    monthly: { amount: 3500, currency: 'usd' }, // $35.00
    yearly: { amount: 35000, currency: 'usd' }, // $350.00 (17% off vs monthly)
  },
  {
    claimId: 'business',
    name: 'Pacta Business',
    description:
      'Unlimited documents · 10 team members ($20/seat over) · CFR21 + HIPAA · embedded signing · full AI features · priority support',
    monthly: { amount: 19900, currency: 'usd' }, // $199.00
    yearly: { amount: 199000, currency: 'usd' }, // $1990.00 (17% off vs monthly)
  },
];

// ─── Load STRIPE_API_KEY from env or scripts/.creds.env ──────────────────
function loadApiKey() {
  if (process.env.STRIPE_API_KEY) return process.env.STRIPE_API_KEY;

  const credsPath = path.join(REPO_ROOT, 'scripts/.creds.env');
  if (fs.existsSync(credsPath)) {
    const content = fs.readFileSync(credsPath, 'utf-8');
    // Match: export STRIPE_API_KEY="sk_test_..." (with or without quotes)
    const match = content.match(/STRIPE_API_KEY=["']?([^"'\s]+)["']?/);
    if (match) return match[1];
  }
  return null;
}

const apiKey = loadApiKey();
if (!apiKey) {
  console.error('❌ STRIPE_API_KEY not found.');
  console.error('');
  console.error('Get your test secret key from:');
  console.error('  https://dashboard.stripe.com/test/apikeys');
  console.error('');
  console.error('Then save it to scripts/.creds.env (gitignored):');
  console.error('  echo \'export STRIPE_API_KEY="sk_test_..."\' >> scripts/.creds.env');
  console.error('');
  console.error('Or run with the env var inline:');
  console.error('  STRIPE_API_KEY=sk_test_... node scripts/bizrethink-stripe-setup.mjs');
  process.exit(1);
}

// Lazy import — only fail if stripe SDK actually missing
const { default: Stripe } = await import('stripe').catch(() => {
  console.error('❌ "stripe" package not installed. Run `npm install` at repo root.');
  process.exit(1);
});

const stripe = new Stripe(apiKey, { apiVersion: '2024-10-28.acacia' });
const isLive = apiKey.startsWith('sk_live');

// ─── Helpers ─────────────────────────────────────────────────────────────
async function upsertProduct(tier) {
  // Idempotency: search Stripe for an existing product with this claimId.
  // stripe.products.search supports metadata queries on all accounts.
  const search = await stripe.products.search({
    query: `metadata['claimId']:'${tier.claimId}' AND active:'true'`,
  });

  let product;
  if (search.data.length > 0) {
    product = search.data[0];
    console.log(`  ✓ Product exists: ${product.id} (${product.name})`);

    // Update name/description/metadata if anything drifted
    const needsUpdate =
      product.name !== tier.name ||
      product.description !== tier.description ||
      product.metadata.claimId !== tier.claimId;

    if (needsUpdate) {
      product = await stripe.products.update(product.id, {
        name: tier.name,
        description: tier.description,
        metadata: { claimId: tier.claimId },
      });
      console.log(`  ✓ Updated product fields`);
    }
  } else {
    product = await stripe.products.create({
      name: tier.name,
      description: tier.description,
      metadata: { claimId: tier.claimId },
    });
    console.log(`  + Created product: ${product.id}`);
  }

  const monthlyPrice = await upsertPrice(product, 'month', tier.monthly);
  const yearlyPrice = await upsertPrice(product, 'year', tier.yearly);

  return {
    productId: product.id,
    monthlyPriceId: monthlyPrice.id,
    yearlyPriceId: yearlyPrice.id,
  };
}

async function upsertPrice(product, interval, spec) {
  const list = await stripe.prices.list({
    product: product.id,
    active: true,
    limit: 100,
  });

  const existing = list.data.find((p) => p.recurring?.interval === interval);

  if (existing) {
    if (
      existing.unit_amount === spec.amount &&
      existing.currency === spec.currency &&
      existing.metadata.visibleInApp === 'true'
    ) {
      console.log(`    ✓ Price ${interval}ly: ${existing.id} ($${spec.amount / 100})`);
      return existing;
    }

    // Amount or metadata drifted — archive the old, create a new one.
    // Stripe disallows editing unit_amount on existing prices.
    console.log(`    ⚠ Price ${interval}ly drift detected; archiving ${existing.id}`);
    await stripe.prices.update(existing.id, { active: false });
  }

  const created = await stripe.prices.create({
    product: product.id,
    currency: spec.currency,
    unit_amount: spec.amount,
    recurring: { interval },
    tax_behavior: 'exclusive', // tax added on top at checkout via Stripe Tax
    metadata: { visibleInApp: 'true' },
  });
  console.log(`    + Created price ${interval}ly: ${created.id} ($${spec.amount / 100})`);
  return created;
}

// ─── Main ────────────────────────────────────────────────────────────────
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  Pacta Stripe Products + Prices setup');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  Mode:    ${isLive ? '⚠️  LIVE — real money mode' : 'sandbox (test mode)'}`);
console.log(`  Tiers:   ${TIERS.map((t) => t.claimId).join(', ')}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

if (isLive) {
  console.log('');
  console.log('⚠️  This will modify your LIVE Stripe account.');
  console.log('   Aborting in 5 seconds unless you Ctrl-C now…');
  await new Promise((r) => setTimeout(r, 5000));
}

const results = [];
for (const tier of TIERS) {
  console.log('');
  console.log(`▸ ${tier.name} (claimId="${tier.claimId}")`);
  try {
    const r = await upsertProduct(tier);
    results.push({ tier, ...r });
  } catch (err) {
    console.error(`  ✗ Failed: ${err.message}`);
    process.exit(1);
  }
}

// ─── Output env-var block ───────────────────────────────────────────────
console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  Coolify env vars — copy this block into Coolify');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log(`STRIPE_API_KEY=${apiKey}`);
console.log(`STRIPE_WEBHOOK_SECRET=<paste from Stripe webhook endpoint>`);
console.log('NEXT_PUBLIC_FEATURE_BILLING_ENABLED=true');
console.log('');
for (const r of results) {
  const key = r.tier.claimId.toUpperCase();
  console.log(`STRIPE_PRICE_ID_${key}_MONTHLY=${r.monthlyPriceId}`);
  console.log(`STRIPE_PRICE_ID_${key}_YEARLY=${r.yearlyPriceId}`);
}
console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  Webhook endpoint — create manually in Stripe dashboard');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('  URL:    https://sign.pacta.ink/api/stripe.webhook');
console.log('  Events:');
console.log('    • customer.subscription.created');
console.log('    • customer.subscription.updated');
console.log('    • customer.subscription.deleted');
console.log('    • invoice.payment_succeeded');
console.log('    • invoice.payment_failed');
console.log('');
console.log('  After creating, copy the "Signing secret" (whsec_...) and');
console.log('  paste it as STRIPE_WEBHOOK_SECRET in Coolify.');
console.log('');
console.log('  Stripe → Developers → Webhooks → Add endpoint');
console.log('  https://dashboard.stripe.com/test/webhooks');
console.log('');
