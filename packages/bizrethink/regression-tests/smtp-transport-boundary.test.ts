import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { testOrgSmtp } from '../server-only/test-org-smtp';

const { lookup, createTransport, verify, close } = vi.hoisted(() => ({
  lookup: vi.fn(),
  createTransport: vi.fn(),
  verify: vi.fn(),
  close: vi.fn(),
}));
vi.mock('node:dns/promises', () => ({ lookup }));
vi.mock('nodemailer', () => ({ createTransport }));
const config = {
  host: 'smtp.example.invalid',
  port: 587,
  secure: false,
  username: 'synthetic',
  password: 'synthetic-test-password',
};
beforeEach(() => {
  vi.clearAllMocks();
  lookup.mockResolvedValue([{ address: '8.8.8.8', family: 4 }]);
  verify.mockResolvedValue(true);
  createTransport.mockReturnValue({ verify, close });
});
afterEach(() => vi.useRealTimers());

describe('SMTP transport destination and lifecycle', () => {
  it.each([
    '127.0.0.1',
    '10.0.0.1',
    '169.254.169.254',
    '::1',
    '100.64.0.1',
  ])('rejects non-public host %s before creating a transport', async (host) => {
    expect(await testOrgSmtp({ ...config, host })).toMatchObject({ ok: false });
    expect(createTransport).not.toHaveBeenCalled();
  });

  it('does not create a transport if DNS fails', async () => {
    lookup.mockRejectedValue(new Error('ENOTFOUND'));
    expect(await testOrgSmtp(config)).toMatchObject({ ok: false });
    expect(createTransport).not.toHaveBeenCalled();
  });

  it('pins a public address and keeps TLS validation tied to the original hostname', async () => {
    expect(await testOrgSmtp(config)).toEqual({ ok: true });
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: '8.8.8.8',
        requireTLS: true,
        tls: expect.objectContaining({ servername: config.host, rejectUnauthorized: true }),
      }),
    );
    expect(close).toHaveBeenCalled();
  });

  it('returns a bounded error that cannot echo credentials or remote banners', async () => {
    verify.mockRejectedValue(new Error(`remote banner: ${config.password} ${'x'.repeat(10_000)}`));
    const result = await testOrgSmtp(config);
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain(config.password);
    expect(JSON.stringify(result).length).toBeLessThan(512);
  });

  it('ends a test whose verification never finishes', async () => {
    vi.useFakeTimers();
    verify.mockReturnValue(new Promise(() => {}));
    let result: Awaited<ReturnType<typeof testOrgSmtp>> | undefined;
    const pending = testOrgSmtp(config).then((value) => {
      result = value;
    });
    await vi.advanceTimersByTimeAsync(10_001);
    expect(result).toMatchObject({ ok: false });
    expect(close).toHaveBeenCalled();
    await pending;
  });
});
