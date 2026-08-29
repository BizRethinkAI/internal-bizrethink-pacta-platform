import { prisma } from '@documenso/prisma';
import { adminProcedure, router } from '@documenso/trpc/server/trpc';
import { z } from 'zod';

import { encryptSsoString, invalidateProviderConfig } from '../sso-provider-config';

// Phase F (overlay 014 prerequisite): TRPC router for SSO provider config.

const ZProvider = z.enum(['google', 'microsoft', 'oidc']);

const ZUpdateInput = z.object({
  provider: ZProvider,
  enabled: z.boolean(),
  clientId: z.string(),
  clientSecret: z.string(),
  oidcWellKnownUrl: z.string(),
  oidcProviderLabel: z.string(),
  oidcSkipVerify: z.boolean(),
  oidcPrompt: z.string(),
});

const ZGetOutput = z.array(
  z.object({
    provider: ZProvider,
    enabled: z.boolean(),
    hasClientId: z.boolean(),
    hasClientSecret: z.boolean(),
    oidcWellKnownUrl: z.string().nullable(),
    oidcProviderLabel: z.string().nullable(),
    oidcSkipVerify: z.boolean(),
    oidcPrompt: z.string().nullable(),
    updatedAt: z.date().nullable(),
  }),
);

export const ssoProviderRouter = router({
  list: adminProcedure.output(ZGetOutput).query(async () => {
    const rows = await prisma.bizrethinkSsoProvider.findMany();
    const byProvider = new Map(rows.map((r) => [r.provider, r]));

    return (['google', 'microsoft', 'oidc'] as const).map((provider) => {
      const row = byProvider.get(provider);
      return {
        provider,
        enabled: row?.enabled ?? false,
        hasClientId: !!row?.clientId,
        hasClientSecret: !!row?.clientSecret,
        oidcWellKnownUrl: row?.oidcWellKnownUrl ?? null,
        oidcProviderLabel: row?.oidcProviderLabel ?? null,
        oidcSkipVerify: row?.oidcSkipVerify ?? false,
        oidcPrompt: row?.oidcPrompt ?? null,
        updatedAt: row?.updatedAt ?? null,
      };
    });
  }),

  update: adminProcedure
    .input(ZUpdateInput)
    .output(z.object({ ok: z.literal(true) }))
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.bizrethinkSsoProvider.findUnique({
        where: { provider: input.provider },
      });

      const enc = (val: string, prev: string | null) => (val ? encryptSsoString(val) : (prev ?? null));

      const data = {
        enabled: input.enabled,
        clientId: enc(input.clientId, existing?.clientId ?? null),
        clientSecret: enc(input.clientSecret, existing?.clientSecret ?? null),
        oidcWellKnownUrl: input.oidcWellKnownUrl || null,
        oidcProviderLabel: input.oidcProviderLabel || null,
        oidcSkipVerify: input.oidcSkipVerify,
        oidcPrompt: input.oidcPrompt || null,
        updatedByUserId: ctx.user.id,
      };

      await prisma.bizrethinkSsoProvider.upsert({
        where: { provider: input.provider },
        create: { provider: input.provider, ...data },
        update: data,
      });

      invalidateProviderConfig(input.provider);

      return { ok: true as const };
    }),

  delete: adminProcedure
    .input(z.object({ provider: ZProvider }))
    .output(z.object({ ok: z.literal(true) }))
    .mutation(async ({ input }) => {
      await prisma.bizrethinkSsoProvider.deleteMany({
        where: { provider: input.provider },
      });
      invalidateProviderConfig(input.provider);
      return { ok: true as const };
    }),
});
