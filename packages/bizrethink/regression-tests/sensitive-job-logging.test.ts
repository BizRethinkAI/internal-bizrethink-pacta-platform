import type { JobRunIO } from '@documenso/lib/jobs/client/_internal/job';
import { LocalJobProvider } from '@documenso/lib/jobs/client/local';
import { Hono } from 'hono';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const captured = vi.hoisted(() => ({ lines: [] as string[], updates: vi.fn() }));
vi.mock('@documenso/prisma', () => ({ prisma: { backgroundJob: { update: captured.updates } } }));
vi.mock('@documenso/lib/server-only/crypto/verify', () => ({ verify: () => true }));
vi.mock('pino', async (importOriginal) => {
  const real = await importOriginal<typeof import('pino')>();
  const { Writable } = await import('node:stream');
  const destination = new Writable({
    write(chunk, _encoding, done) {
      captured.lines.push(String(chunk));
      done();
    },
  });
  return {
    ...real,
    pino: (options: import('pino').LoggerOptions) => real.pino({ ...options, transport: undefined }, destination),
  };
});
const secret = 'synthetic-job-confirmation-bearer';
const handler = vi.fn(async ({ payload, io }: { payload: unknown; io: JobRunIO }) => {
  io.logger.info('Confirmation input', payload);
  io.logger.error(new Error(`Unexpected SQL parameter: ${secret}`));
});
const provider = LocalJobProvider.getInstance();
provider.defineJob({
  id: 'sensitive-job-test',
  name: 'Sensitive job test',
  version: '1',
  trigger: { name: 'sensitive-job-test' },
  handler,
});
const app = new Hono().post('/', provider.getApiHandler());
beforeEach(() => {
  captured.lines.length = 0;
  captured.updates.mockResolvedValue({ id: 'synthetic-job-id', retried: 0, maxRetries: 3 });
  for (const method of ['log', 'info', 'warn', 'error', 'debug'] as const) {
    vi.spyOn(console, method).mockImplementation((...args) => captured.lines.push(JSON.stringify(args)));
  }
});
afterEach(() => vi.restoreAllMocks());
it('A-21 executes an authenticated job with its original payload but emits no payload or raw error text', async () => {
  const response = await app.request('/', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-job-id': 'synthetic-job-id',
      'x-job-signature': 'test-signature',
    },
    body: JSON.stringify({ name: 'sensitive-job-test', payload: { token: secret, url: `/verify-email/${secret}` } }),
  });
  expect(response.status).toBe(200);
  expect(handler).toHaveBeenCalledWith(
    expect.objectContaining({ payload: { token: secret, url: `/verify-email/${secret}` } }),
  );
  expect(captured.lines.join('')).not.toContain(secret);
  expect(captured.lines.join('')).not.toContain('Unexpected SQL parameter');
  expect(captured.lines.length).toBeGreaterThan(0);
});
