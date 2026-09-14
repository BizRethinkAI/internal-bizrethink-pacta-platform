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
it('A-21 nested child serializers, message prefixes and late bindings cannot reintroduce credentials', () => {
  const nested = logger.child({ cookie: secret }).child(
    { requestPath: `/d/${secret}` },
    {
      msgPrefix: secret,
      serializers: { err: () => ({ token: secret, message: secret }) },
    },
  );
  nested.setBindings({ authorization: secret, payload: { secret } });
  nested.error({ err: new Error(secret), event: 'request.failed' }, secret);
  const serialized = captured.lines.join('');
  expect(serialized).not.toContain(secret);
  expect(JSON.parse(captured.lines[0])).toMatchObject({ event: 'request.failed', level: 50 });
});
it('A-21 avoids getters/custom serialization and leaves original application data intact', () => {
  const getter = vi.fn(() => secret);
  const payload = { token: secret, toJSON: vi.fn(() => ({ token: secret })) };
  const input = Object.defineProperty({ event: 'document.access', input: payload }, 'userId', { get: getter });
  logger.info(input);
  expect(captured.lines.join('')).not.toContain(secret);
  expect(getter).not.toHaveBeenCalled();
  expect(payload.toJSON).not.toHaveBeenCalled();
  expect(payload.token).toBe(secret);
});
it('keeps stable non-bearer ID correlation and actionable error codes across log methods', () => {
  const child = logger.child({ documentId: 'synthetic-document-id' });
  child.info({ statusCode: 200 });
  logger.error({
    documentId: 'synthetic-document-id',
    error: Object.assign(new Error(secret), { code: 'ECONNREFUSED' }),
  });
  const [left, right] = captured.lines.map((line) => JSON.parse(line));
  expect(left.documentId).toBe(right.documentId);
  expect(right.documentId).toMatch(/^sha256:/);
  expect(right.error.code).toBe('ECONNREFUSED');
});
it('A-21 child bindings cannot smuggle strings through intrinsic Pino timestamp fields', () => {
  logger.child({ time: secret }).info({ event: 'document.access' });
  expect(captured.lines.join('')).not.toContain(secret);
  expect(JSON.parse(captured.lines[0])).toMatchObject({ level: 30, time: expect.any(Number) });
});
it('retains fixed authentication error codes while omitting their sensitive messages', () => {
  logger.error({ error: Object.assign(new Error(secret), { code: 'INVALID_CREDENTIALS' }) });
  expect(captured.lines.join('')).not.toContain(secret);
  expect(JSON.parse(captured.lines[0]).error.code).toBe('INVALID_CREDENTIALS');
});
