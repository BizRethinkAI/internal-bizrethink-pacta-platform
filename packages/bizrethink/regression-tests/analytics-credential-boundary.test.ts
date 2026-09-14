import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { action, loader } from '../../../apps/remix/app/routes/_redirects+/ingest.$';

const forward = vi.fn<typeof fetch>();
beforeEach(() => {
  vi.stubGlobal('fetch', forward);
  forward.mockReset().mockResolvedValue(
    new Response('accepted', {
      headers: {
        'content-type': 'text/plain',
        'set-cookie': 'vendor=synthetic; Path=/',
        'cache-control': 'public, max-age=60',
        'content-encoding': 'gzip',
        'content-length': '999',
      },
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());
const request = () =>
  new Request('https://app.example.invalid/ingest/e/?ip=1', {
    method: 'POST',
    headers: {
      cookie: 'pacta-session=synthetic-session-secret',
      authorization: 'Bearer synthetic-credential',
      'x-csrf-token': 'synthetic-csrf',
      'x-forwarded-for': '192.0.2.10',
      'x-api-key': 'synthetic-api-key',
      referer: 'https://app.example.invalid/sign/synthetic-signing-token',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ event: 'synthetic-event', api_key: 'public-project-key' }),
  });
const call = (req: Request) => action({ request: req, params: {}, context: {} } as Parameters<typeof action>[0]);
it('A-17 forwards the event body without application credentials or client address headers', async () => {
  await call(request());
  const [target, options] = forward.mock.calls[0];
  expect(new URL(String(target)).hostname).toBe('eu.i.posthog.com');
  const headers = new Headers(options?.headers);
  for (const name of ['cookie', 'authorization', 'x-csrf-token', 'x-api-key', 'x-forwarded-for', 'referer']) {
    expect(headers.get(name), name).toBeNull();
  }
  expect(headers.get('content-type')).toBe('application/json');
  expect(await new Response(options?.body).json()).toEqual({ event: 'synthetic-event', api_key: 'public-project-key' });
});
it('A-17 cannot follow a provider redirect carrying a request body to another host', async () => {
  await call(request());
  expect(forward.mock.calls[0][1]).toMatchObject({ redirect: 'error', credentials: 'omit' });
});
it('A-17 removes vendor Set-Cookie and decoded transport headers from the application response', async () => {
  const response = await call(request());
  expect(response.headers.get('set-cookie')).toBeNull();
  expect(response.headers.get('content-encoding')).toBeNull();
  expect(response.headers.get('content-length')).toBeNull();
  expect(response.headers.get('cache-control')).toBe('public, max-age=60');
  expect(await response.text()).toBe('accepted');
});
it('preserves the fixed asset host and cache validation for static analytics files', async () => {
  const req = new Request('https://app.example.invalid/ingest/static/array.js?v=1', {
    headers: { 'if-none-match': 'synthetic-etag' },
  });
  await loader({ request: req, params: {}, context: {} } as Parameters<typeof loader>[0]);
  expect(String(forward.mock.calls[0][0])).toBe('https://eu-assets.i.posthog.com/static/array.js?v=1');
  expect(new Headers(forward.mock.calls[0][1]?.headers).get('if-none-match')).toBe('synthetic-etag');
});
