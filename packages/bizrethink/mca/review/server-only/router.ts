import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { prisma } from '@documenso/prisma';
import { adminProcedure, authenticatedProcedure, procedure, router } from '@documenso/trpc/server/trpc';
import { z } from 'zod';
import {
  answerProviderFinding,
  listProviderReviews,
  providerReviewScope,
  revokeProviderReview,
  shareProviderReview,
} from './provider-service';
import {
  completePackageReview,
  inspectPackageReview,
  markPackageReviewUnit,
  openPackageReview,
  recordPackageFinding,
  shareLibraryPackage,
} from './service';

const ZProviderScope = z.object({
  teamId: z.number().int().positive(),
  id: z.string().min(1),
  version: z.number().int().positive(),
});
const ZInvitation = z.object({
  reviewerName: z.string().trim().min(1).max(200),
  reviewerEmail: z.string().email(),
  contact: z.string().trim().min(1).max(500),
});

export const mcaPackageReviewRouter = router({
  share: adminProcedure
    .input(
      z.object({
        reviewerName: z.string().trim().min(1).max(200),
        reviewerEmail: z.string().email(),
        contact: z.string().trim().min(1).max(500),
      }),
    )
    .mutation(({ input, ctx }) => shareLibraryPackage({ ...input, userId: ctx.user.id })),
  list: adminProcedure.query(() =>
    prisma.bizrethinkMcaPackageReview.findMany({
      where: { kind: 'library', teamId: null },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        token: true,
        reviewerName: true,
        reviewerEmail: true,
        fingerprint: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        completedAt: true,
        reviewedTargetIds: true,
        findings: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, targetIds: true, body: true, authorName: true, answer: true, answeredAt: true },
        },
      },
    }),
  ),
  open: procedure.input(z.object({ token: z.string().max(200) })).query(({ input }) => openPackageReview(input.token)),
  recordFinding: procedure
    .input(
      z.object({
        token: z.string().max(200),
        targetIds: z.array(z.string().max(250)).min(1).max(50),
        body: z.string().trim().min(1).max(10000),
      }),
    )
    .mutation(({ input }) => recordPackageFinding(input)),
  revoke: adminProcedure.input(z.object({ reviewId: z.string() })).mutation(async ({ input }) => {
    await prisma.bizrethinkMcaPackageReview.updateMany({
      where: { id: input.reviewId, status: 'open', kind: 'library', teamId: null },
      data: { status: 'closed' },
    });
    return { revoked: true };
  }),
  answer: adminProcedure
    .input(z.object({ findingId: z.string(), answer: z.string().trim().min(1).max(10000) }))
    .mutation(async ({ input, ctx }) => {
      const result = await prisma.bizrethinkMcaPackageFinding.updateMany({
        where: { id: input.findingId, answeredAt: null, review: { kind: 'library', teamId: null } },
        data: { answer: input.answer, answeredAt: new Date(), answeredByUserId: ctx.user.id },
      });
      if (result.count !== 1) {
        throw new AppError(AppErrorCode.NOT_FOUND, { message: 'This finding is unavailable or already answered.' });
      }
      return { answered: true };
    }),
  markUnit: procedure
    .input(z.object({ token: z.string().max(200), targetId: z.string().max(250), reviewed: z.boolean() }))
    .mutation(({ input }) => markPackageReviewUnit(input)),
  inspect: adminProcedure
    .input(z.object({ reviewId: z.string() }))
    .query(({ input }) => inspectPackageReview({ id: input.reviewId, kind: 'library', teamId: null })),
  inspectProvider: authenticatedProcedure
    .input(ZProviderScope.extend({ reviewId: z.string() }))
    .query(async ({ input, ctx }) =>
      inspectPackageReview({ ...(await providerReviewScope({ ...input, userId: ctx.user.id })), id: input.reviewId }),
    ),
  complete: procedure
    .input(z.object({ token: z.string().max(200) }))
    .mutation(({ input }) => completePackageReview(input.token)),
  shareProvider: authenticatedProcedure
    .input(ZProviderScope.merge(ZInvitation).extend({ processorText: z.string().max(500000).nullable() }))
    .mutation(({ input, ctx }) => shareProviderReview({ ...input, userId: ctx.user.id })),
  listProvider: authenticatedProcedure
    .input(ZProviderScope)
    .query(({ input, ctx }) => listProviderReviews({ ...input, userId: ctx.user.id })),
  revokeProvider: authenticatedProcedure
    .input(ZProviderScope.extend({ reviewId: z.string() }))
    .mutation(({ input, ctx }) => revokeProviderReview({ ...input, userId: ctx.user.id })),
  answerProvider: authenticatedProcedure
    .input(ZProviderScope.extend({ findingId: z.string(), answer: z.string().trim().min(1).max(10000) }))
    .mutation(({ input, ctx }) => answerProviderFinding({ ...input, userId: ctx.user.id })),
});
