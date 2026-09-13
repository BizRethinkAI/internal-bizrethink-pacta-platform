import { randomUUID } from 'node:crypto';
import { prisma } from '@documenso/prisma';
import { adminProcedure } from '@documenso/trpc/server/trpc';
import { ZSetMcaAccessRequestSchema } from './router.types';

/** Instance admins opt in their own account. No customer-wide grant or arbitrary target ID. */
export const setMcaAccessRoute = adminProcedure.input(ZSetMcaAccessRequestSchema).mutation(async ({ ctx, input }) => {
  const { feature, enabled } = input;
  const key = { feature, scope: 'user', scopeId: String(ctx.user.id) };
  await prisma.bizrethinkFeatureAccess.upsert({
    where: { feature_scope_scopeId: key },
    create: {
      id: randomUUID(),
      ...key,
      enabled,
      grantedByUserId: ctx.user.id,
      note: 'Admin self-service MCA workspace access',
    },
    update: { enabled, grantedByUserId: ctx.user.id },
  });
  return { enabled };
});
