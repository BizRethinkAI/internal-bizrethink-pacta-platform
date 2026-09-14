import { prisma } from '@documenso/prisma';
import { adminProcedure, router } from '@documenso/trpc/server/trpc';
import { z } from 'zod';
import { ZResourcePolicy } from '../../resource-policy';
import { getResourcePolicy } from '../resources/trial-policy';

export const resourcePolicyRouter = router({
  get: adminProcedure.output(ZResourcePolicy).query(() => getResourcePolicy()),
  update: adminProcedure
    .input(ZResourcePolicy)
    .output(z.object({ ok: z.literal(true) }))
    .mutation(async ({ input, ctx }) => {
      const data = { ...input, updatedByUserId: ctx.user.id };
      await prisma.bizrethinkInstanceResourcePolicy.upsert({
        where: { id: 'singleton' },
        create: { id: 'singleton', ...data },
        update: data,
      });
      return { ok: true as const };
    }),
});
