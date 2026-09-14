import { Hono } from 'hono';
import { afterEach, expect, it, vi } from 'vitest';
import { requestBodyLimits } from '../server-only/resources/request-body-limits';

const app = new Hono().use(requestBodyLimits).post('*', async (c) => {
  try {
    return c.json({ size: (await c.req.arrayBuffer()).byteLength });
  } catch {
    return c.json({ error: 'Parser failed' }, 400);
  }
});
afterEach(() => vi.useRealTimers());
it('caps unknown-length JSON while preserving a parser-independent 413', async () => {
  let cancelled = false;
  let chunks = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(c) {
      if (chunks++ < 5) {
        c.enqueue(new Uint8Array(1024 * 1024));
      } else {
        c.close();
      }
    },
    cancel() {
      cancelled = true;
    },
  });
  const result = await app.fetch(
    new Request('http://fixture.invalid/api/auth/example', {
      method: 'POST',
      body: stream,
      duplex: 'half',
    } as RequestInit),
  );
  expect(result.status).toBe(413);
  expect(cancelled).toBe(true);
});
it('ends a stalled body at the read deadline', async () => {
  vi.useFakeTimers();
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    pull() {
      return new Promise(() => {});
    },
    cancel() {
      cancelled = true;
    },
  });
  const response = app.fetch(
    new Request('http://fixture.invalid/api/auth/example', {
      method: 'POST',
      body: stream,
      duplex: 'half',
    } as RequestInit),
  );
  await vi.advanceTimersByTimeAsync(30_001);
  expect((await response).status).toBe(408);
  expect(cancelled).toBe(true);
});
it('preserves valid request bytes', async () => {
  expect(await (await app.request('/api/trpc/example', { method: 'POST', body: 'synthetic' })).json()).toEqual({
    size: 9,
  });
});
it('retains the larger dedicated lease upload allowance', async () => {
  const response = await app.request('/api/bizrethink.lease-document', {
    method: 'POST',
    body: 'pdf',
    headers: { 'content-length': String(128 * 1024 * 1024) },
  });
  expect(response.status).toBe(200);
});
