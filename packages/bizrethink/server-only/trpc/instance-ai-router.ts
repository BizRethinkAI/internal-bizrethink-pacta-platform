import { prisma } from '@documenso/prisma';
import { adminProcedure, router } from '@documenso/trpc/server/trpc';
import { z } from 'zod';

import { encryptAiString, invalidateAiConfig } from '../instance-ai-config';

// Phase H (overlay 016 prerequisite): TRPC router for Vertex AI config.

const ZUpdateInput = z.object({
  enabled: z.boolean(),
  vertexProjectId: z.string(),
  vertexLocation: z.string(),
  vertexApiKey: z.string(),
});

const ZGetOutput = z
  .object({
    enabled: z.boolean(),
    vertexProjectId: z.string().nullable(),
    vertexLocation: z.string().nullable(),
    hasVertexApiKey: z.boolean(),
    updatedAt: z.date(),
  })
  .nullable();

export const instanceAiRouter = router({
  get: adminProcedure.output(ZGetOutput).query(async () => {
    const row = await prisma.bizrethinkInstanceAiConfig.findUnique({
      where: { id: 'singleton' },
    });
    if (!row) {
      return null;
    }
    return {
      enabled: row.enabled,
      vertexProjectId: row.vertexProjectId,
      vertexLocation: row.vertexLocation,
      hasVertexApiKey: !!row.vertexApiKey,
      updatedAt: row.updatedAt,
    };
  }),

  update: adminProcedure
    .input(ZUpdateInput)
    .output(z.object({ ok: z.literal(true) }))
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.bizrethinkInstanceAiConfig.findUnique({
        where: { id: 'singleton' },
      });

      const apiKey = input.vertexApiKey ? encryptAiString(input.vertexApiKey) : (existing?.vertexApiKey ?? null);

      const data = {
        enabled: input.enabled,
        vertexProjectId: input.vertexProjectId || null,
        vertexLocation: input.vertexLocation || null,
        vertexApiKey: apiKey,
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

  reset: adminProcedure.output(z.object({ ok: z.literal(true) })).mutation(async () => {
    await prisma.bizrethinkInstanceAiConfig.deleteMany({ where: { id: 'singleton' } });
    invalidateAiConfig();
    return { ok: true as const };
  }),
});
