import { LocalJobProvider } from '@documenso/lib/jobs/client/local';
import { Hono } from 'hono';
import { beforeEach, expect, it, vi } from 'vitest';

const { db, verify } = vi.hoisted(() => ({ db: { backgroundJob: { update: vi.fn() } }, verify: vi.fn() }));
vi.mock('@documenso/prisma', () => ({ prisma: db }));
vi.mock('@documenso/lib/server-only/crypto/verify', () => ({ verify }));
const provider = LocalJobProvider.getInstance();
provider.defineJob({
  id: 'bounded-test',
  name: 'Bounded test',
  version: '1',
  enabled: true,
  trigger: { name: 'bounded-test' },
  handler: async () => undefined,
});
const app = new Hono().post('/', provider.getApiHandler());
beforeEach(() => {
  vi.resetAllMocks();
  verify.mockReturnValue(false);
});
it('A-10 rejects missing job credentials before attempting JSON decoding', async () => {
  const response = await app.request('/', { method: 'POST', body: '{malformed' });
  expect(response.status).toBe(401);
  expect(verify).not.toHaveBeenCalled();
  expect(db.backgroundJob.update).not.toHaveBeenCalled();
});
it('A-10 stops an oversized local-job payload before signature work or persistence', async () => {
  const response = await app.request('/', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-job-id': 'synthetic',
      'x-job-signature': 'synthetic-signature',
      'content-length': String(3 * 1024 * 1024),
    },
    body: JSON.stringify({ name: 'bounded-test', payload: {} }),
  });
  expect(response.status).toBe(413);
  expect(verify).not.toHaveBeenCalled();
  expect(db.backgroundJob.update).not.toHaveBeenCalled();
});
it('keeps signature verification ahead of any job state update', async () => {
  const response = await app.request('/', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-job-id': 'synthetic', 'x-job-signature': 'synthetic-signature' },
    body: JSON.stringify({ name: 'bounded-test', payload: {} }),
  });
  expect(response.status).toBe(401);
  expect(verify).toHaveBeenCalledOnce();
  expect(db.backgroundJob.update).not.toHaveBeenCalled();
});
