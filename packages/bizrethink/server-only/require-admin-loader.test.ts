import { Role } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { requireAdminLoader } from './require-admin-loader';

// Overlay 073: the admin-loader gate that closes the React Router single-fetch
// `.data?_routes=` bypass of the admin layout's authorization.

const { mockedGetOptionalSession } = vi.hoisted(() => ({
  mockedGetOptionalSession: vi.fn(),
}));

vi.mock('@documenso/auth/server/lib/utils/get-session', () => ({
  getOptionalSession: mockedGetOptionalSession,
}));

const request = new Request('http://audit.invalid/admin/site-settings.data');

const admin = { id: 1, roles: [Role.ADMIN] };
const member = { id: 2, roles: [Role.USER] };

beforeEach(() => {
  mockedGetOptionalSession.mockReset();
});

const status = async (): Promise<number> => {
  try {
    await requireAdminLoader(request);
    return 200;
  } catch (thrown) {
    if (thrown instanceof Response) {
      return thrown.status;
    }
    throw thrown;
  }
};

describe('requireAdminLoader', () => {
  it('returns the user when an admin session is present', async () => {
    mockedGetOptionalSession.mockResolvedValueOnce({ isAuthenticated: true, user: admin });
    await expect(requireAdminLoader(request)).resolves.toBe(admin);
  });

  it('throws 404 for an anonymous request (the single-fetch bypass path)', async () => {
    mockedGetOptionalSession.mockResolvedValueOnce({ isAuthenticated: false, user: null });
    expect(await status()).toBe(404);
  });

  it('throws 404 for a signed-in non-admin', async () => {
    mockedGetOptionalSession.mockResolvedValueOnce({ isAuthenticated: true, user: member });
    expect(await status()).toBe(404);
  });

  it('does not leak existence: same 404 for anonymous and non-admin', async () => {
    mockedGetOptionalSession.mockResolvedValueOnce({ isAuthenticated: false, user: null });
    const anon = await status();
    mockedGetOptionalSession.mockResolvedValueOnce({ isAuthenticated: true, user: member });
    const nonAdmin = await status();
    expect(anon).toBe(nonAdmin);
  });
});
