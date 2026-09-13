import { createServer, type RequestOptions, type Server } from 'node:https';
import type { AddressInfo } from 'node:net';

import { executeWebhookCall } from '@documenso/lib/server-only/webhooks/execute-webhook-call';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createOutboundTlsFixture } from './outbound-tls-fixture';

const { lookup, transportState } = vi.hoisted(() => ({
  lookup: vi.fn(),
  transportState: { ca: undefined as Buffer | undefined, requests: [] as RequestOptions[] },
}));
vi.mock('node:dns/promises', () => ({ lookup }));
vi.mock('../server-only/webhook-config', () => ({
  getWebhookSsrfBypassHosts: async () => new Set(['receiver.invalid', 'wrong.invalid']),
}));
vi.mock('node:https', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:https')>();
  return {
    ...original,
    request: (options: RequestOptions, callback: Parameters<typeof original.request>[2]) => {
      transportState.requests.push(options);
      // Only add the synthetic test CA. The actual request's pinned address,
      // SNI, certificate-name check, trust enforcement and HTTP I/O remain real.
      return original.request({ ...options, ca: transportState.ca }, callback);
    },
  };
});

let tls: ReturnType<typeof createOutboundTlsFixture>;
let server: Server;
let port: number;
let received: { host?: string; secret?: string; payload: string }[];
beforeAll(async () => {
  tls = createOutboundTlsFixture();
  received = [];
  server = createServer(tls, (req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      received.push({
        host: req.headers.host,
        secret: req.headers['x-documenso-secret']?.toString(),
        payload: Buffer.concat(chunks).toString(),
      });
      res.end('{"received":true}');
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  port = (server.address() as AddressInfo).port;
});
afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
beforeEach(() => {
  lookup.mockReset().mockResolvedValue([{ address: '127.0.0.1', family: 4 }]);
  transportState.ca = tls.cert;
  transportState.requests = [];
  received = [];
});
const call = (host = 'receiver.invalid') =>
  executeWebhookCall({
    url: `https://${host}:${port}/callback?fixture=1`,
    body: { event: 'synthetic.test' },
    secret: 'synthetic-only',
  });

describe('real pinned HTTPS connections', () => {
  it('delivers with the original Host, SNI, secret and payload', async () => {
    expect(await call()).toMatchObject({ success: true, responseBody: { received: true } });
    expect(received).toEqual([
      { host: `receiver.invalid:${port}`, secret: 'synthetic-only', payload: '{"event":"synthetic.test"}' },
    ]);
    expect(transportState.requests[0]).toMatchObject({
      hostname: '127.0.0.1',
      servername: 'receiver.invalid',
      agent: false,
      rejectUnauthorized: true,
    });
    expect(lookup).toHaveBeenCalledTimes(1);
  });

  it('rejects a trusted certificate for the wrong hostname before sending the secret', async () => {
    expect(await call('wrong.invalid')).toMatchObject({ success: false, responseCode: 0 });
    expect(received).toEqual([]);
  });

  it('rejects an untrusted certificate even when its hostname matches', async () => {
    transportState.ca = undefined;
    expect(await call()).toMatchObject({ success: false, responseCode: 0 });
    expect(received).toEqual([]);
  });

  it('checks DNS again for each new attempt', async () => {
    expect(await call()).toMatchObject({ success: true });
    lookup.mockRejectedValue(new Error('synthetic DNS failure on retry'));
    expect(await call()).toMatchObject({ success: false });
    expect(received).toHaveLength(1);
    expect(transportState.requests).toHaveLength(1);
  });
});
