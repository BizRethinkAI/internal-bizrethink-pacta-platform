import { prisma } from '@documenso/prisma';
import type { Prisma } from '@prisma/client';

/** Include in the email-proof transaction; never reset an existing completion. */
export const pendingVerifiedOnboarding = (userId: number, transaction: Prisma.TransactionClient = prisma) =>
  transaction.bizrethinkVerifiedOnboarding.upsert({ where: { userId }, create: { userId }, update: {} });
