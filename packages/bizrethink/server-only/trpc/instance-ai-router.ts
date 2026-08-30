import { prisma } from '@documenso/prisma';
import { adminProcedure, router } from '@documenso/trpc/server/trpc';
import { z } from 'zod';

import { AI_PROVIDERS } from '../../lease/ai/providers';
import { testAiConnection } from '../../lease/server-only/draft-clause';
import { encryptAiString, invalidateAiConfig } from '../instance-ai-config';

/**
 * Instance AI credentials.
 *
 * Simplified 2026-08-30 from a Vertex-shaped config (project ID, location, API
 * key) to a provider and a key. Those three collected credentials for two
 * different products at once — the Gemini API takes a key alone, Vertex proper
 * needs a service account — so at least two of them could never be
 * load-bearing, and in fact none were: the model was forward scaffolding for
 * an upstream AI feature that never shipped.
 */

const ZUpdateInput = z.object({
  enabled: z.boolean(),
  provider: z.enum(AI_PROVIDERS),
  /** Empty means "keep the stored key", so the page need not re-send a secret. */
  apiKey: z.string(),
});

const ZGetOutput = z
  .object({
    enabled: z.boolean(),
    provider: z.string(),
    hasApiKey: z.boolean(),
    updatedAt: z.date(),
  })
  .nullable();

export const instanceAiRouter = router({
  get: adminProcedure.output(ZGetOutput).query(async () => {
    const row = await prisma.bizrethinkInstanceAiConfig.findUnique({ where: { id: 'singleton' } });

    if (!row) {
      return null;
    }

    return {
      enabled: row.enabled,
      provider: row.provider,
      // The key itself never leaves the server, only whether one is set.
      hasApiKey: !!row.apiKey,
      updatedAt: row.updatedAt,
    };
  }),

  update: adminProcedure
    .input(ZUpdateInput)
    .output(z.object({ ok: z.literal(true) }))
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.bizrethinkInstanceAiConfig.findUnique({ where: { id: 'singleton' } });

      const apiKey = input.apiKey ? encryptAiString(input.apiKey) : (existing?.apiKey ?? null);

      const data = {
        enabled: input.enabled,
        provider: input.provider,
        apiKey,
        updatedByUserId: ctx.user.id,
      };

      await prisma.bizrethinkInstanceAiConfig.upsert({
        where: { id: 'singleton' },
        create: { id: 'singleton', ...data },
        update: data,
      });

      invalidateAiConfig();

      return { ok: true as const };
    }),

  /**
   * Does the stored key actually work?
   *
   * Every other instance-config page has this. Without it the first real test
   * of a key was trying to draft a clause and reading a failure that could
   * equally have been a bad prompt.
   */
  test: adminProcedure
    .output(z.object({ ok: z.boolean(), provider: z.string().optional(), error: z.string().optional() }))
    .mutation(async () => {
      // Reads the row rather than the cache: an admin testing a key they just
      // saved must not be answered from a value loaded before the save.
      invalidateAiConfig();

      const result = await testAiConnection();

      return result.ok ? { ok: true, provider: result.provider } : { ok: false, error: result.error };
    }),

  reset: adminProcedure.output(z.object({ ok: z.literal(true) })).mutation(async () => {
    await prisma.bizrethinkInstanceAiConfig.deleteMany({ where: { id: 'singleton' } });
    invalidateAiConfig();

    return { ok: true as const };
  }),
});
