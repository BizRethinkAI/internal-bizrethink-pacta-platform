import { beforeEach, expect, it, vi } from 'vitest';

const captured = vi.hoisted(() => ({ lines: [] as string[] }));
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

import { logger } from '@documenso/lib/utils/logger';

const secret = 'synthetic-signing-bearer-canary';
beforeEach(() => {
  captured.lines.length = 0;
  logger.level = 'info';
});
it('A-21 actual serialized logs exclude nested credentials and document input', () => {
  logger.info({
    event: 'document.access',
    requestId: '091d0c6a-0e7d-4a2f-a559-2863325868ad',
    statusCode: 403,
    input: { access: { token: secret }, email: 'person@example.invalid', fields: [{ value: 'private contract text' }] },
    headers: { authorization: `Bearer ${secret}` },
  });
  const serialized = captured.lines.join('');
  expect(serialized).not.toContain(secret);
  expect(serialized).not.toContain('person@example.invalid');
  expect(serialized).not.toContain('private contract text');
  expect(JSON.parse(captured.lines[0])).toMatchObject({ event: 'document.access', statusCode: 403 });
});
it('A-21 child bindings cannot carry cookies, identifying client headers or bearer paths', () => {
  logger
    .child({
      requestId: '091d0c6a-0e7d-4a2f-a559-2863325868ad',
      requestPath: `/sign/${secret}?token=${secret}`,
      cookie: secret,
      userAgent: secret,
      ipAddress: '192.0.2.99',
    })
    .info({ status: 'error' });
  expect(captured.lines.join('')).not.toContain(secret);
  expect(captured.lines.join('')).not.toContain('192.0.2.99');
  expect(JSON.parse(captured.lines[0]).requestId).toBe('091d0c6a-0e7d-4a2f-a559-2863325868ad');
});
it('A-21 Error serialization, interpolated strings and arbitrary objects cannot bypass redaction', () => {
  const error = Object.assign(new Error(`SQL parameters contain ${secret}`), { code: 'P2002', payload: { secret } });
  logger.error({ err: error }, 'Request failed: %s', secret);
  logger.info(`Signing URL https://app.example.invalid/sign/${secret}`);
  logger.warn({ unknown: secret, toJSON: () => ({ token: secret }) });
  expect(captured.lines.join('')).not.toContain(secret);
  expect(captured.lines.join('')).not.toContain('SQL parameters');
  expect(JSON.parse(captured.lines[0])).toMatchObject({ err: { code: 'P2002' } });
});
