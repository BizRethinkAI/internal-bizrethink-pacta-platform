import { createServer, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { setImmediate } from 'node:timers/promises';
import { gzipSync } from 'node:zlib';

import { executeWebhookCall } from '@documenso/lib/server-only/webhooks/execute-webhook-call';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { lookup, bypassHosts } = vi.hoisted(() => ({ lookup: vi.fn(), bypassHosts: vi.fn() }));
vi.mock('node:dns/promises', () => ({ lookup }));
vi.mock('../server-only/webhook-config', () => ({ getWebhookSsrfBypassHosts: bypassHosts }));

let server: Server | undefined;
beforeEach(() => {
  bypassHosts.mockResolvedValue(new Set(['127.0.0.1', 'receiver.invalid']));
  lookup.mockReset().mockResolvedValue([{ address: '127.0.0.1', family: 4 }]);
});
afterEach(async () => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  if (server) {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server?.close(() => resolve()));
    server = undefined;
  }
});
const listen = async (respond: (response: ServerResponse) => void) => {
  server = createServer((request, response) => {
    request.resume();
    respond(response);
  });
  await new Promise<void>((resolve, reject) => {
    server?.once('error', reject);
    server?.listen(0, '127.0.0.1', resolve);
  });
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}/callback`;
};
const call = (url: string) =>
  executeWebhookCall({ url, body: { event: 'synthetic.test' }, secret: 'synthetic-test-secret' });

describe('webhook execution and response boundaries', () => {
  it('does not dispatch after a failed DNS check', async () => {
    bypassHosts.mockResolvedValue(new Set());
    lookup.mockRejectedValue(new Error('ENOTFOUND'));
    const fetch = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetch);
    expect(await call('https://receiver.invalid')).toMatchObject({ success: false, responseCode: 0 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('connects to the checked address without resolving the hostname again', async () => {
    const url = (await listen((res) => res.end('{"received":true}'))).replace('127.0.0.1', 'receiver.invalid');
    lookup
      .mockResolvedValueOnce([{ address: '127.0.0.1', family: 4 }])
      .mockRejectedValue(new Error('a second DNS lookup is forbidden'));
    expect(await call(url)).toMatchObject({ success: true, responseBody: { received: true } });
    expect(lookup).toHaveBeenCalledTimes(1);
  });

  it('retains ordinary JSON responses', async () => {
    const url = await listen((res) => {
      res.setHeader('Content-Type', 'application/json');
      res.end('{"received":true}');
    });
    expect(await call(url)).toMatchObject({ success: true, responseCode: 200, responseBody: { received: true } });
  });

  it('retains small compressed responses', async () => {
    const url = await listen((res) => {
      res.setHeader('Content-Encoding', 'gzip');
      res.end(gzipSync('{"received":true}'));
    });
    expect(await call(url)).toMatchObject({ success: true, responseBody: { received: true } });
  });

  it.each([false, true])('rejects an oversized response (compressed=%s)', async (compressed) => {
    const payload = Buffer.alloc(256 * 1024, 'x');
    const url = await listen((res) => {
      if (compressed) {
        res.setHeader('Content-Encoding', 'gzip');
      }
      res.end(compressed ? gzipSync(payload) : payload);
    });
    const result = await call(url);
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.responseBody).length).toBeLessThan(1024);
  });

  it('bounds response headers before storing them', async () => {
    const url = await listen((res) => {
      res.setHeader('X-Large', 'x'.repeat(12 * 1024));
      res.end('{}');
    });
    expect(await call(url)).toMatchObject({ success: false, responseHeaders: {} });
  });

  it('never follows redirects', async () => {
    let received = 0;
    const url = await listen((res) => {
      received += 1;
      res.writeHead(302, { Location: 'http://127.0.0.1/private' });
      res.end();
    });
    expect(await call(url)).toMatchObject({ success: false, responseCode: 302 });
    expect(received).toBe(1);
  });

  it('keeps the deadline active after response headers arrive', async () => {
    const headersSent = Promise.withResolvers<void>();
    const url = await listen((res) => {
      res.writeHead(200);
      res.flushHeaders();
      headersSent.resolve();
    });
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    let result: Awaited<ReturnType<typeof call>> | undefined;
    const pending = call(url).then((value) => {
      result = value;
    });
    await headersSent.promise;
    for (let i = 0; i < 10; i += 1) {
      await setImmediate();
    }
    await vi.advanceTimersByTimeAsync(10_001);
    for (let i = 0; i < 10; i += 1) {
      await setImmediate();
    }
    try {
      expect(result).toMatchObject({ success: false, responseCode: 0 });
    } finally {
      server?.closeAllConnections();
      await pending;
    }
  });
});
