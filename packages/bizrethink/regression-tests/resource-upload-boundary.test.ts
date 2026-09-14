import { logger } from '@documenso/lib/utils/logger';
import { Hono } from 'hono';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { filesRoute } from '../../../apps/remix/server/api/files/files';
import type { HonoEnv } from '../../../apps/remix/server/router';

const { db, session, putFile } = vi.hoisted(() => ({
  db: { bizrethinkPdfUpload: { create: vi.fn() }, rateLimit: { upsert: vi.fn() }, $transaction: vi.fn() },
  session: vi.fn(),
  putFile: vi.fn(),
}));
vi.mock('@documenso/prisma', () => ({ prisma: db }));
vi.mock('@documenso/auth/server/lib/utils/get-session', () => ({ getOptionalSession: session }));
vi.mock('@documenso/lib/universal/upload/put-file.server', () => ({ putNormalizedPdfFileServerSide: putFile }));
const app = new Hono<HonoEnv>()
  .use('*', async (c, next) => {
    c.set('logger', logger);
    await next();
  })
  .route('/', filesRoute);
const body = () => {
  const form = new FormData();
  form.set('file', new File(['%PDF-synthetic'], 'test.pdf', { type: 'application/pdf' }));
  return form;
};
beforeEach(() => {
  vi.clearAllMocks();
  logger.level = 'silent';
  session.mockResolvedValue({ user: { id: 17 }, session: { id: 'synthetic' } });
  putFile.mockResolvedValue({ id: 'upload_test', type: 'BYTES_64', data: 'synthetic', initialData: 'synthetic' });
  db.rateLimit.upsert.mockResolvedValue({ count: 1 });
  db.$transaction.mockImplementation(async (operation) =>
    typeof operation === 'function' ? operation(db) : Promise.all(operation),
  );
});
afterEach(() => vi.restoreAllMocks());
it('A-10 rejects anonymous requests before multipart decoding', async () => {
  session.mockResolvedValue({ user: null, session: null });
  const parse = vi.spyOn(Request.prototype, 'formData').mockRejectedValue(new Error('multipart was decoded'));
  const responseParse = vi.spyOn(Response.prototype, 'formData').mockRejectedValue(new Error('multipart was decoded'));
  const response = await app.request('/upload-pdf', { method: 'POST', body: body() });
  expect(response.status).toBe(401);
  expect(parse).not.toHaveBeenCalled();
  expect(responseParse).not.toHaveBeenCalled();
  expect(putFile).not.toHaveBeenCalled();
});
it('A-10 rejects an oversized whole multipart body before storage, including extra fields', async () => {
  const response = await app.request('/upload-pdf', {
    method: 'POST',
    body: '--test--\r\n',
    headers: { 'content-type': 'multipart/form-data; boundary=test', 'content-length': String(53 * 1024 * 1024) },
  });
  expect(response.status).toBe(413);
  expect(putFile).not.toHaveBeenCalled();
});
it('A-10 cancels oversized chunked input while reading instead of fully parsing it', async () => {
  let cancelled = false;
  let supplied = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      supplied++;
      if (supplied > 60) {
        controller.close();
        return;
      }
      controller.enqueue(new Uint8Array(1024 * 1024));
    },
    cancel() {
      cancelled = true;
    },
  });
  const responsePromise = app.fetch(
    new Request('http://fixture.invalid/upload-pdf', {
      method: 'POST',
      body: stream,
      duplex: 'half',
      headers: { 'content-type': 'multipart/form-data; boundary=test' },
    } as RequestInit),
  );
  // Malformed input still exercises buffering before form decoding; the new
  // bounded reader must cancel before draining this finite over-limit source.
  const response = await responsePromise;
  expect(response.status).toBe(413);
  expect(cancelled).toBe(true);
  expect(supplied).toBeLessThanOrEqual(54);
  expect(putFile).not.toHaveBeenCalled();
});
it('preserves a valid authenticated PDF and its upload ownership receipt', async () => {
  const response = await app.request('/upload-pdf', { method: 'POST', body: body() });
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ id: 'upload_test' });
  expect(db.bizrethinkPdfUpload.create).toHaveBeenCalledOnce();
});
it('A-10 queues a small upload burst before reading bodies while retaining two active processors', async () => {
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let processing = 0;
  let peak = 0;
  putFile.mockImplementation(async () => {
    processing++;
    peak = Math.max(peak, processing);
    await held;
    processing--;
    return { id: 'upload_test', type: 'BYTES_64', data: 'synthetic', initialData: 'synthetic' };
  });
  const responses = [1, 2, 3].map(() => app.request('/upload-pdf', { method: 'POST', body: body() }));
  await vi.waitFor(() => expect(putFile).toHaveBeenCalledTimes(2));
  release();
  expect((await Promise.all(responses)).map((response) => response.status)).toEqual([200, 200, 200]);
  expect(peak).toBe(2);
});
