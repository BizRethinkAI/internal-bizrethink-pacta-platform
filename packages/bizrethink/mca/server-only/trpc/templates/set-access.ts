import { randomUUID } from 'node:crypto';
import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { prisma } from '@documenso/prisma';
import { adminProcedure } from '@documenso/trpc/server/trpc';
import { ZSetMcaAccessRequestSchema } from './router.types';

/**
 * Instance admins opt themselves in — for one organisation, or account-wide.
 *
 * `organisationId` writes the organisation scope the resolver has understood
 * since the lease builder but which nothing ever wrote. Without it the only
 * grant available was the user-scoped one, and that is not scoped to anything:
 * `getFeatureAccess` returns true for every organisationId it is asked about,
 * so the single control turned the feature on everywhere the admin was a
 * member, with no way to choose which.
 *
 * Still no arbitrary target ID. The organisation has to be one this admin
 * belongs to, so instance admin remains permission to opt IN, not permission
 * to switch a feature on inside a customer's account.
 */
export const setMcaAccessRoute = adminProcedure.input(ZSetMcaAccessRequestSchema).mutation(async ({ ctx, input }) => {
  const { feature, enabled, organisationId } = input;

  if (organisationId !== undefined) {
    const membership = await prisma.organisation.findFirst({
      where: {
        id: organisationId,
        members: { some: { userId: ctx.user.id } },
      },
      select: { id: true },
    });

    if (!membership) {
      throw new AppError(AppErrorCode.NOT_FOUND, {
        message: 'That organisation is not one of yours.',
      });
    }
  }

  const key =
    organisationId === undefined
      ? { feature, scope: 'user', scopeId: String(ctx.user.id) }
      : { feature, scope: 'organisation', scopeId: organisationId };

  await prisma.bizrethinkFeatureAccess.upsert({
    where: { feature_scope_scopeId: key },
    create: {
      id: randomUUID(),
      ...key,
      enabled,
      grantedByUserId: ctx.user.id,
      note:
        organisationId === undefined
          ? 'Admin self-service MCA workspace access'
          : 'Admin self-service MCA workspace access, one organisation',
    },
    update: { enabled, grantedByUserId: ctx.user.id },
  });

  return { enabled };
});
