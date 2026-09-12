import { AppError } from '@documenso/lib/errors/app-error';
import { assertNotPrivateUrl } from '@documenso/lib/server-only/webhooks/assert-webhook-url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { bypassHosts } = vi.hoisted(() => ({ bypassHosts: vi.fn() }));
vi.mock('../server-only/webhook-config', () => ({ getWebhookSsrfBypassHosts: bypassHosts }));

beforeEach(() => {
  bypassHosts.mockResolvedValue(new Set());
});
afterEach(() => vi.useRealTimers());

describe('outbound destination validation through the real webhook guard', () => {
  it('fails closed on DNS errors', async () => {
    const lookup = vi.fn().mockRejectedValue(new Error('ENOTFOUND'));
    await expect(assertNotPrivateUrl('https://receiver.invalid', { lookup })).rejects.toBeInstanceOf(AppError);
  });

  it('fails closed when DNS does not finish', async () => {
    vi.useFakeTimers();
    const lookup = vi.fn().mockReturnValue(new Promise(() => {}));
    const result = assertNotPrivateUrl('https://receiver.invalid', { lookup }).catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(10_001);
    expect(await result).toBeInstanceOf(AppError);
  });

  it('requires at least one valid address', async () => {
    await expect(
      assertNotPrivateUrl('https://receiver.invalid', { lookup: vi.fn().mockResolvedValue([]) }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it.each([
    'http://100.64.0.1',
    'http://169.254.169.254',
    'http://0.1.2.3',
    'http://198.18.0.1',
    'http://224.0.0.1',
    'http://[febf::1]',
    'http://[::ffff:127.0.0.1]',
    'http://[64:ff9b::7f00:1]',
    'http://[2002:7f00:1::]',
  ])('rejects non-public and address-translation destinations: %s', async (url) => {
    const lookup = vi.fn().mockResolvedValue([{ address: '8.8.8.8', family: 4 }]);
    await expect(assertNotPrivateUrl(url, { lookup })).rejects.toBeInstanceOf(AppError);
  });

  it.each([
    'ftp://8.8.8.8',
    'https://name:password@8.8.8.8',
    'not a URL',
  ])('rejects invalid request targets: %s', async (url) => {
    await expect(assertNotPrivateUrl(url)).rejects.toBeInstanceOf(AppError);
  });

  it('rejects a mixed public/private DNS answer', async () => {
    const lookup = vi.fn().mockResolvedValue([
      { address: '8.8.8.8', family: 4 },
      { address: '10.0.0.4', family: 4 },
    ]);
    await expect(assertNotPrivateUrl('https://receiver.invalid', { lookup })).rejects.toBeInstanceOf(AppError);
  });

  it('permits a public destination', async () => {
    const lookup = vi.fn().mockResolvedValue([{ address: '8.8.8.8', family: 4 }]);
    await expect(assertNotPrivateUrl('https://receiver.invalid', { lookup })).resolves.toBeUndefined();
  });

  it('keeps an exact admin exception without exempting it from DNS failure', async () => {
    bypassHosts.mockResolvedValue(new Set(['internal.invalid']));
    const lookup = vi.fn().mockRejectedValue(new Error('ENOTFOUND'));
    await expect(assertNotPrivateUrl('http://internal.invalid', { lookup })).rejects.toBeInstanceOf(AppError);
  });
});
