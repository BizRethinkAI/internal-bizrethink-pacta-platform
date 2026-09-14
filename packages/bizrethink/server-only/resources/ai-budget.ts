import { randomUUID } from 'node:crypto';
import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { prisma } from '@documenso/prisma';
import { Prisma } from '@prisma/client';
import { getTrialLimits } from './trial-policy';

export type AiActor = { userId: number; organisationId: string | null };
export type AiBudget = {
  signal: AbortSignal;
  remainingPages: () => number;
  consumePages: (count: number) => void;
  reserveProviderCalls: (count: number) => Promise<void>;
};
const limited = () =>
  new AppError(AppErrorCode.TOO_MANY_REQUESTS, {
    statusCode: 429,
    message: 'AI processing allowance or capacity has been reached. Try again later.',
  });
const reserveDaily = async (tx: Prisma.TransactionClient, key: string, action: string, count: number, cap: number) => {
  const bucket = new Date();
  bucket.setUTCHours(0, 0, 0, 0);
  const row = await tx.rateLimit.upsert({
    where: { key_action_bucket: { key, action, bucket } },
    create: { key, action, bucket, count },
    update: { count: { increment: count } },
  });
  if (row.count > cap) {
    throw limited();
  }
};

/** Authoritative actor, durable cross-replica limits, then bounded provider work. */
export const withAiBudget = async <T>(actor: AiActor, operation: (budget: AiBudget) => Promise<T>): Promise<T> => {
  const user = await prisma.user.findFirst({ where: { id: actor.userId, disabled: false }, select: { roles: true } });
  if (!user) {
    throw new AppError(AppErrorCode.UNAUTHORIZED);
  }
  if (actor.organisationId) {
    const organisation = await prisma.organisation.findFirst({
      where: { id: actor.organisationId, members: { some: { userId: actor.userId } } },
      select: { id: true },
    });
    if (!organisation) {
      throw new AppError(AppErrorCode.NOT_FOUND);
    }
    const trial = await getTrialLimits(actor.organisationId);
    if (trial && trial.expiresAt.getTime() <= Date.now()) {
      throw limited();
    }
  } else if (!user.roles.includes('ADMIN')) {
    throw new AppError(AppErrorCode.UNAUTHORIZED);
  }

  const id = randomUUID();
  await prisma.$transaction(async (tx) => {
    // One short admission lock; no provider/network work runs in this transaction.
    await tx.$queryRaw(Prisma.sql`SELECT 1 AS locked FROM pg_advisory_xact_lock(762012, 0)`);
    const now = new Date();
    await tx.bizrethinkResourceLease.deleteMany({ where: { kind: 'ai', expiresAt: { lte: now } } });
    const active = { kind: 'ai', expiresAt: { gt: now } };
    const [instance, user, organisation] = await Promise.all([
      tx.bizrethinkResourceLease.count({ where: active }),
      tx.bizrethinkResourceLease.count({ where: { ...active, userId: actor.userId } }),
      tx.bizrethinkResourceLease.count({ where: { ...active, organisationId: actor.organisationId } }),
    ]);
    if (instance >= 4 || user >= 1 || organisation >= 2) {
      throw limited();
    }
    await reserveDaily(tx, `ai-user:${actor.userId}`, 'ai-request', 1, 20);
    await tx.bizrethinkResourceLease.create({
      data: { id, kind: 'ai', ...actor, expiresAt: new Date(now.getTime() + 120_000) },
    });
  });

  const controller = new AbortController();
  let remainingPages = 20;
  let abort = () => {};
  const deadline = new Promise<never>((_resolve, reject) => {
    abort = () => {
      controller.abort();
      reject(limited());
    };
  });
  const timer = setTimeout(abort, 60_000);
  const budget: AiBudget = {
    signal: controller.signal,
    remainingPages: () => remainingPages,
    consumePages: (count) => {
      controller.signal.throwIfAborted();
      if (!Number.isSafeInteger(count) || count < 0 || count > remainingPages) {
        throw limited();
      }
      remainingPages -= count;
    },
    reserveProviderCalls: async (count) => {
      controller.signal.throwIfAborted();
      if (!Number.isSafeInteger(count) || count < 1 || count > 20) {
        throw limited();
      }
      await prisma.$transaction(async (tx) => {
        await reserveDaily(tx, `ai-user:${actor.userId}`, 'ai-provider-call', count, 100);
        await reserveDaily(tx, `ai-org:${actor.organisationId ?? 'admin-tests'}`, 'ai-provider-call', count, 500);
        await reserveDaily(tx, 'ai-instance', 'ai-provider-call', count, 1000);
      });
      controller.signal.throwIfAborted();
    },
  };
  try {
    return await Promise.race([operation(budget), deadline]);
  } finally {
    clearTimeout(timer);
    controller.abort();
    await prisma.bizrethinkResourceLease.deleteMany({ where: { id } });
  }
};
