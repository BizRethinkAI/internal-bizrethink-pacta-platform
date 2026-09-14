import { expect, it, vi } from 'vitest';
import { normalizeBoundedPdf } from '../server-only/resources/media-worker';

const { workers } = vi.hoisted(() => ({ workers: [] as Array<{ emit: (event: string, value: unknown) => void }> }));
vi.mock('node:worker_threads', async () => {
  const { EventEmitter } = await import('node:events');
  return {
    Worker: vi.fn(function worker() {
      const instance = Object.assign(new EventEmitter(), { terminate: async () => 0 });
      workers.push(instance);
      return instance;
    }),
  };
});
it('A-10 limits the combined bytes retained by active and queued media tasks', async () => {
  const input = Buffer.alloc(90 * 1024 * 1024);
  const requests: Promise<unknown>[] = [];
  let thirdError: unknown;
  try {
    requests.push(normalizeBoundedPdf(input), normalizeBoundedPdf(input));
    requests.push(
      normalizeBoundedPdf(input).catch((error) => {
        thirdError = error;
      }),
    );
    for (let i = 0; i < 10; i++) {
      await Promise.resolve();
    }
    expect(thirdError).toMatchObject({ code: 'TOO_MANY_REQUESTS' });
    expect(workers).toHaveLength(2);
  } finally {
    for (let i = 0; i < 20; i++) {
      for (const worker of workers) {
        worker.emit('message', { ok: true, bytes: new Uint8Array([1]) });
      }
      await Promise.resolve();
    }
    await Promise.allSettled(requests);
  }
});
