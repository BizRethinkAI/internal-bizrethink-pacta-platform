import { z } from 'zod';

import { prisma } from '@documenso/prisma';
import { adminProcedure, router } from '@documenso/trpc/server/trpc';

import { encryptStripeCredential, invalidateStripeConfig } from '../instance-stripe-config';
import { syncStripeProducts } from '../sync-stripe-products';
import { testStripeConnection } from '../test-stripe-connection';

// Phase K (overlay 045 / admin UI): TRPC router for instance Stripe config.
//
// Procedures (all admin-only):
//   bizrethink.instanceStripe.get         — fetch the singleton, redact secrets
//   bizrethink.instanceStripe.update      — write the singleton; encrypt secrets;
//                                            bust caches; rebuild Stripe SDK
//   bizrethink.instanceStripe.test        — call stripe.balance.retrieve(),
//                                            persist last-tested timestamp
//   bizrethink.instanceStripe.switchMode  — flip sandbox ↔ live, rebuild SDK
//   bizrethink.instanceStripe.syncProducts — idempotent product + price setup
//                                            against the active mode
//
// Pattern mirrors instance-signing-router.ts exactly: per-secret-field
// "empty input = keep existing, non-blank = encrypt and replace" semantics,
// admin-only gate, cache bust after every write.

const ZMode = z.enum(['sandbox', 'live']);

const ZUpdateInput = z.object({
  billingEnabled: z.boolean(),
  statementDescriptor: z.string(),

  // Sandbox credentials — empty string means "keep existing".
  sandboxApiKey: z.string(),
  sandboxWebhookSecret: z.string(),
  sandboxPublishableKey: z.string(),

  // Live credentials — same "empty = keep existing" semantics.
  liveApiKey: z.string(),
  liveWebhookSecret: z.string(),
  livePublishableKey: z.string(),
});

const ZGetOutput = z
  .object({
    mode: ZMode,
    billingEnabled: z.boolean(),
    statementDescriptor: z.string().nullable(),

    hasSandboxApiKey: z.boolean(),
    hasSandboxWebhookSecret: z.boolean(),
    sandboxPublishableKey: z.string().nullable(),
    sandboxApiKeyLast4: z.string().nullable(),

    hasLiveApiKey: z.boolean(),
    hasLiveWebhookSecret: z.boolean(),
    livePublishableKey: z.string().nullable(),
    liveApiKeyLast4: z.string().nullable(),

    lastTestedSandbox: z.date().nullable(),
    lastTestErrorSandbox: z.string().nullable(),
    lastTestedLive: z.date().nullable(),
    lastTestErrorLive: z.string().nullable(),

    updatedAt: z.date(),
    updatedByUserId: z.number().nullable(),
  })
  .nullable();

// Encrypted blobs aren't reversible to a "last 4" hint without decrypting,
// which we deliberately avoid in the redacted `get` output. We return
// publishable keys' last-4 instead (they're plaintext + safe to show).
const last4 = (s: string | null): string | null => (s ? s.slice(-4) : null);

const getRoute = adminProcedure.output(ZGetOutput).query(async () => {
  const row = await prisma.bizrethinkInstanceStripeConfig.findUnique({
    where: { id: 'singleton' },
  });

  if (!row) {
    return null;
  }

  return {
    mode: row.mode === 'live' ? ('live' as const) : ('sandbox' as const),
    billingEnabled: row.billingEnabled,
    statementDescriptor: row.statementDescriptor,

    hasSandboxApiKey: !!row.sandboxApiKey,
    hasSandboxWebhookSecret: !!row.sandboxWebhookSecret,
    sandboxPublishableKey: row.sandboxPublishableKey,
    sandboxApiKeyLast4: last4(row.sandboxPublishableKey),

    hasLiveApiKey: !!row.liveApiKey,
    hasLiveWebhookSecret: !!row.liveWebhookSecret,
    livePublishableKey: row.livePublishableKey,
    liveApiKeyLast4: last4(row.livePublishableKey),

    lastTestedSandbox: row.lastTestedSandbox,
    lastTestErrorSandbox: row.lastTestErrorSandbox,
    lastTestedLive: row.lastTestedLive,
    lastTestErrorLive: row.lastTestErrorLive,

    updatedAt: row.updatedAt,
    updatedByUserId: row.updatedByUserId,
  };
});

const updateRoute = adminProcedure
  .input(ZUpdateInput)
  .output(z.object({ ok: z.literal(true) }))
  .mutation(async ({ input, ctx }) => {
    const existing = await prisma.bizrethinkInstanceStripeConfig.findUnique({
      where: { id: 'singleton' },
    });

    // Per-secret-field: blank → keep existing; non-blank → encrypt + replace.
    const sandboxApiKey = input.sandboxApiKey
      ? encryptStripeCredential(input.sandboxApiKey)
      : (existing?.sandboxApiKey ?? null);

    const sandboxWebhookSecret = input.sandboxWebhookSecret
      ? encryptStripeCredential(input.sandboxWebhookSecret)
      : (existing?.sandboxWebhookSecret ?? null);

    const liveApiKey = input.liveApiKey
      ? encryptStripeCredential(input.liveApiKey)
      : (existing?.liveApiKey ?? null);

    const liveWebhookSecret = input.liveWebhookSecret
      ? encryptStripeCredential(input.liveWebhookSecret)
      : (existing?.liveWebhookSecret ?? null);

    await prisma.bizrethinkInstanceStripeConfig.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        billingEnabled: input.billingEnabled,
        mode: existing?.mode ?? 'sandbox',
        statementDescriptor: input.statementDescriptor || null,
        sandboxApiKey,
        sandboxWebhookSecret,
        sandboxPublishableKey: input.sandboxPublishableKey || null,
        liveApiKey,
        liveWebhookSecret,
        livePublishableKey: input.livePublishableKey || null,
        updatedByUserId: ctx.user.id,
      },
      update: {
        billingEnabled: input.billingEnabled,
        statementDescriptor: input.statementDescriptor || null,
        sandboxApiKey,
        sandboxWebhookSecret,
        sandboxPublishableKey: input.sandboxPublishableKey || null,
        liveApiKey,
        liveWebhookSecret,
        livePublishableKey: input.livePublishableKey || null,
        updatedByUserId: ctx.user.id,
      },
    });

    invalidateStripeConfig();

    // Rebuild the Stripe SDK singleton so the next checkout / webhook /
    // billing read uses the new credentials.
    const { invalidateStripeClient } = await import('@documenso/lib/server-only/stripe');
    await invalidateStripeClient();

    return { ok: true as const };
  });

const testRoute = adminProcedure
  .input(z.object({ mode: ZMode }))
  .output(
    z.object({
      ok: z.boolean(),
      error: z.string().nullable(),
      accountId: z.string().nullable(),
      livemode: z.boolean().nullable(),
    }),
  )
  .mutation(async ({ input }) => {
    // Test runs against the row-stored credentials for the requested mode,
    // NOT the currently-active mode. This lets admins verify live creds
    // are valid before switching to live mode.
    const { getInstanceStripeConfig } = await import('../instance-stripe-config');
    const config = await getInstanceStripeConfig();

    // The getter returns the ACTIVE mode's decrypted creds. For testing a
    // non-active mode, we need to read + decrypt directly from the row.
    const row = await prisma.bizrethinkInstanceStripeConfig.findUnique({
      where: { id: 'singleton' },
    });

    if (!row) {
      return {
        ok: false,
        error: 'No Stripe config saved yet — paste credentials and Save first',
        accountId: null,
        livemode: null,
      };
    }

    const cipherText = input.mode === 'live' ? row.liveApiKey : row.sandboxApiKey;

    if (!cipherText) {
      return {
        ok: false,
        error: `No ${input.mode} API key saved`,
        accountId: null,
        livemode: null,
      };
    }

    // Decrypt the requested mode's API key (different from the active mode's
    // creds returned by the getter when admin tests a not-yet-active mode).
    const { bytesToUtf8 } = await import('@noble/ciphers/utils');
    const { symmetricDecrypt } = await import('@documenso/lib/universal/crypto');
    const { DOCUMENSO_ENCRYPTION_KEY } = await import('@documenso/lib/constants/crypto');

    const apiKeyBytes = symmetricDecrypt({
      key: DOCUMENSO_ENCRYPTION_KEY ?? '',
      data: cipherText,
    });
    const apiKey = apiKeyBytes ? bytesToUtf8(apiKeyBytes) : null;

    if (!apiKey) {
      return {
        ok: false,
        error: 'Failed to decrypt API key — check NEXT_PRIVATE_ENCRYPTION_KEY',
        accountId: null,
        livemode: null,
      };
    }

    const result = await testStripeConnection(apiKey);

    // Persist last-tested status for the UI's "Connected ✓ 2m ago" badge.
    if (input.mode === 'sandbox') {
      await prisma.bizrethinkInstanceStripeConfig.update({
        where: { id: 'singleton' },
        data: {
          lastTestedSandbox: new Date(),
          lastTestErrorSandbox: result.ok ? null : result.error,
        },
      });
    } else {
      await prisma.bizrethinkInstanceStripeConfig.update({
        where: { id: 'singleton' },
        data: {
          lastTestedLive: new Date(),
          lastTestErrorLive: result.ok ? null : result.error,
        },
      });
    }

    // Silence unused-var warning — getInstanceStripeConfig was imported above
    // for side-effects/future use but we read the row directly here.
    void config;

    return result.ok
      ? { ok: true, error: null, accountId: result.accountId, livemode: result.livemode }
      : { ok: false, error: result.error, accountId: null, livemode: null };
  });

const switchModeRoute = adminProcedure
  .input(z.object({ mode: ZMode }))
  .output(z.object({ ok: z.literal(true), mode: ZMode }))
  .mutation(async ({ input, ctx }) => {
    // Guard: don't allow switch to a mode without a saved API key — would
    // silently break checkout. UI should prevent this too, but we double-
    // check server-side.
    const row = await prisma.bizrethinkInstanceStripeConfig.findUnique({
      where: { id: 'singleton' },
    });

    if (!row) {
      throw new Error('Save Stripe credentials before switching modes');
    }

    const targetApiKey = input.mode === 'live' ? row.liveApiKey : row.sandboxApiKey;
    if (!targetApiKey) {
      throw new Error(`Cannot switch to ${input.mode}: no API key saved for that mode`);
    }

    await prisma.bizrethinkInstanceStripeConfig.update({
      where: { id: 'singleton' },
      data: {
        mode: input.mode,
        updatedByUserId: ctx.user.id,
      },
    });

    invalidateStripeConfig();

    const { invalidateStripeClient } = await import('@documenso/lib/server-only/stripe');
    await invalidateStripeClient();

    return { ok: true as const, mode: input.mode };
  });

const syncProductsRoute = adminProcedure
  .output(
    z.object({
      ok: z.literal(true),
      results: z.array(
        z.object({
          tier: z.enum(['pro', 'business']),
          productId: z.string(),
          monthlyPriceId: z.string(),
          yearlyPriceId: z.string(),
          created: z.object({
            product: z.boolean(),
            monthly: z.boolean(),
            yearly: z.boolean(),
          }),
        }),
      ),
    }),
  )
  .mutation(async () => {
    // Use the active mode's Stripe SDK singleton — overlay 045 ensures
    // it's already reflecting the latest DB-backed credentials.
    const { ensureStripeClient } = await import('@documenso/lib/server-only/stripe');
    const client = await ensureStripeClient();

    const results = await syncStripeProducts(client);

    return { ok: true as const, results };
  });

export const instanceStripeRouter = router({
  get: getRoute,
  update: updateRoute,
  test: testRoute,
  switchMode: switchModeRoute,
  syncProducts: syncProductsRoute,
});
