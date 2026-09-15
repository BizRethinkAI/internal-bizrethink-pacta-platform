import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { prisma } from '@documenso/prisma';
import { adminProcedure, procedure, router } from '@documenso/trpc/server/trpc';
import { z } from 'zod';
import { openPackageReview, recordPackageFinding, shareLibraryPackage } from './service';

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
        targetIds: z.array(z.string().max(250)).length(1),
        body: z.string().trim().min(1).max(10000),
      }),
    )
    .mutation(({ input }) => recordPackageFinding(input)),
  revoke: adminProcedure.input(z.object({ reviewId: z.string() })).mutation(async ({ input }) => {
    await prisma.bizrethinkMcaPackageReview.updateMany({
      where: { id: input.reviewId, status: 'open' },
      data: { status: 'closed' },
    });
    return { revoked: true };
  }),
  answer: adminProcedure
    .input(z.object({ findingId: z.string(), answer: z.string().trim().min(1).max(10000) }))
    .mutation(async ({ input, ctx }) => {
      const result = await prisma.bizrethinkMcaPackageFinding.updateMany({
        where: { id: input.findingId, answeredAt: null },
        data: { answer: input.answer, answeredAt: new Date(), answeredByUserId: ctx.user.id },
      });
      if (result.count !== 1) {
        throw new AppError(AppErrorCode.NOT_FOUND, { message: 'This finding is unavailable or already answered.' });
      }
      return { answered: true };
    }),
});
