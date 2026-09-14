import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, it, vi } from 'vitest';
import { safeSentryOptions } from '../server-only/logging/sentry-options';

type CaptureOptions = {
  beforeSend: (event: Record<string, unknown>) => Record<string, unknown> | null;
  beforeSendTransaction?: (event: Record<string, unknown>) => Record<string, unknown> | null;
  beforeBreadcrumb?: (event: Record<string, unknown>) => Record<string, unknown> | null;
};
const bootstrapOptions = (): CaptureOptions => {
  const init = vi.fn();
  const source = readFileSync(new URL('../../../apps/remix/server/instrument.mjs', import.meta.url), 'utf8');
  runInNewContext(source.replace(/^import .*;$/gm, ''), {
    Sentry: { init },
    safeSentryOptions,
    process: { env: { NODE_ENV: 'production', NEXT_PRIVATE_SENTRY_DSN: 'synthetic-enabled' }, uptime: () => 1, pid: 1 },
    console: { log: vi.fn() },
    setInterval: () => ({ unref: () => undefined }),
  });
  return init.mock.calls[0][0] as CaptureOptions;
};
const secret = 'synthetic-reporting-bearer';
const event = () => ({
  event_id: 'a'.repeat(32),
  level: 'error',
  request: {
    url: `https://app.example.invalid/sign/${secret}`,
    query_string: `token=${secret}`,
    headers: { Authorization: secret, Cookie: secret },
    data: { secret },
  },
  exception: {
    values: [
      {
        type: 'Error',
        value: secret,
        stacktrace: { frames: [{ filename: `https://x.invalid/${secret}`, vars: { secret } }] },
      },
    ],
  },
  message: secret,
  transaction: `/sign/${secret}`,
  user: { email: 'synthetic@example.invalid' },
  breadcrumbs: [{ message: secret, data: { secret } }],
  extra: { secret },
  contexts: { custom: { secret } },
  tags: { secret },
});
it('A-21 Sentry exports neither bearer paths, payloads, breadcrumbs nor raw exception text', () => {
  const options = bootstrapOptions();
  const output = options.beforeSend(event());
  expect(JSON.stringify(output)).not.toContain(secret);
  expect(JSON.stringify(output)).not.toContain('synthetic@example.invalid');
  expect(output).toMatchObject({ event_id: 'a'.repeat(32), level: 'error' });
});
it('A-21 applies the same policy to transactions and drops raw breadcrumbs', () => {
  const options = bootstrapOptions();
  expect(options.beforeSendTransaction).toBeTypeOf('function');
  expect(JSON.stringify(options.beforeSendTransaction?.(event()))).not.toContain(secret);
  expect(options.beforeBreadcrumb?.({ message: secret, data: { secret } })).toBeNull();
});
