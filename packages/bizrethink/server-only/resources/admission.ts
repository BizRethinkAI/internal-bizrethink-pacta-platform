import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { prisma } from '@documenso/prisma';

type Waiting = { grant: () => void };
const processState = globalThis as typeof globalThis & {
  __pactaResourceSlots?: Map<string, number>;
  __pactaResourceQueue?: Map<string, Waiting[]>;
};
const slots = (processState.__pactaResourceSlots ??= new Map<string, number>());
const queues = (processState.__pactaResourceQueue ??= new Map<string, Waiting[]>());
const busy = () =>
  new AppError(AppErrorCode.TOO_MANY_REQUESTS, {
    statusCode: 429,
    message: 'Processing capacity is busy. Try again shortly.',
  });

/** Bounded burst queue. Upload admission happens BEFORE buffering a body. */
export const withResourceSlot = async <T>(kind: string, maximum: number, operation: () => Promise<T>): Promise<T> => {
  const current = slots.get(kind) ?? 0;
  if (current < maximum) {
    slots.set(kind, current + 1);
  } else {
    const queue = queues.get(kind) ?? [];
    queues.set(kind, queue);
    if (queue.length >= 64) {
      throw busy();
    }
    await new Promise<void>((resolve, reject) => {
      const waiting = {
        grant: () => {
          clearTimeout(timer);
          resolve();
        },
      };
      const timer = setTimeout(() => {
        const index = queue.indexOf(waiting);
        if (index >= 0) {
          queue.splice(index, 1);
        }
        reject(busy());
      }, 30_000);
      queue.push(waiting);
    });
  }
  try {
    return await operation();
  } finally {
    const next = queues.get(kind)?.shift();
    if (next) {
      // Transfer the reservation synchronously; a fresh request cannot jump in
      // between releasing the previous task and the queued task's continuation.
      next.grant();
    } else {
      slots.set(kind, Math.max(0, (slots.get(kind) ?? 1) - 1));
    }
  }
};

export const withUploadAdmission = async <T>(userId: number, operation: () => Promise<T>): Promise<T> =>
  withResourceSlot('upload', 2, async () => {
    const key = `upload-user:${userId}`;
    const action = 'bounded-file-upload';
    const bucket = new Date(Math.floor(Date.now() / 3_600_000) * 3_600_000);
    const rate = await prisma.rateLimit.upsert({
      where: { key_action_bucket: { key, action, bucket } },
      create: { key, action, bucket, count: 1 },
      update: { count: { increment: 1 } },
    });
    if (rate.count > 60) {
      throw new AppError(AppErrorCode.TOO_MANY_REQUESTS, {
        statusCode: 429,
        message: 'Upload request limit reached. Try again later.',
      });
    }
    return operation();
  });
