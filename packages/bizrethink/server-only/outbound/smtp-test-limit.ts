import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { getBucket } from '@documenso/lib/server-only/rate-limit/rate-limit';
import { prisma } from '@documenso/prisma';

// Fixed safety budgets for a manual connection-test button; separate from API
// and email delivery quotas. Existing RateLimit cleanup also expires these rows.
export const assertSmtpTestBudget = async (userId: number, organisationId: string) => {
  const bucket = getBucket(10 * 60 * 1000);
  const action = 'bizrethink.smtp-test';
  const counters = [
    { key: `user:${userId}`, max: 5 },
    { key: `org:${organisationId}`, max: 10 },
  ];
  let counts: { count: number }[];
  try {
    counts = await prisma.$transaction(
      counters.map(({ key }) =>
        prisma.rateLimit.upsert({
          where: { key_action_bucket: { key, action, bucket } },
          create: { key, action, bucket, count: 1 },
          update: { count: { increment: 1 } },
          select: { count: true },
        }),
      ),
    );
  } catch {
    throw new AppError(AppErrorCode.INVALID_REQUEST, {
      message: 'SMTP test limits could not be checked. Try again later.',
    });
  }
  if (counts.some(({ count }, index) => count > counters[index].max)) {
    throw new AppError(AppErrorCode.TOO_MANY_REQUESTS, {
      message: 'Too many SMTP connection tests. Try again in ten minutes.',
    });
  }
};
