import { prisma } from '@documenso/prisma';
import type { Prisma } from '@prisma/client';

/** Compose existing constructors without nested transactions or copied schema logic. */
export const accountTransaction = (transaction?: Prisma.TransactionClient) => ({
  $transaction: <T>(work: (tx: Prisma.TransactionClient) => Promise<T>, options?: { timeout: number }): Promise<T> =>
    transaction ? work(transaction) : prisma.$transaction(work, options),
});
