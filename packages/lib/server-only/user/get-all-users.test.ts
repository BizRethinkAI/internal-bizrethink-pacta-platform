import { describe, expect, it, vi } from 'vitest';

import { findUsers } from './get-all-users';

vi.mock('@documenso/prisma', () => ({
  prisma: {
    user: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
  },
}));

vi.mock('@documenso/lib/server-only/user/service-accounts/deleted-account', () => ({
  deletedServiceAccountEmail: () => 'deleted-account@sign.example.test',
}));

vi.mock('@documenso/lib/server-only/user/service-accounts/legacy-service-account', () => ({
  legacyServiceAccountEmail: () => 'serviceaccount@sign.example.test',
}));

import { prisma } from '@documenso/prisma';
const mockedFindMany = vi.mocked(prisma.user.findMany);

describe('findUsers — overlay 053 (filter system service accounts)', () => {
  it('whereClause excludes the two service-account emails under AND', async () => {
    await findUsers({ username: '', email: '', page: 1, perPage: 10 });
    expect(mockedFindMany).toHaveBeenCalledOnce();
    const where = (mockedFindMany.mock.calls[0][0] as { where: unknown }).where as {
      AND?: Array<{
        OR?: unknown;
        email?: { notIn: string[] };
      }>;
    };

    // Must be wrapped in AND[] with at least 2 clauses (OR search + notIn filter)
    expect(where.AND).toBeDefined();
    expect(where.AND!.length).toBeGreaterThanOrEqual(2);

    // The notIn clause excludes both service-account emails (regression guard
    // for overlay 053 — if a future merge collapses the AND back to OR, this
    // assertion will scream).
    const filterClause = where.AND!.find((clause) => clause.email?.notIn);
    expect(filterClause).toBeDefined();
    expect(filterClause!.email!.notIn).toContain('deleted-account@sign.example.test');
    expect(filterClause!.email!.notIn).toContain('serviceaccount@sign.example.test');
  });

  it('username + email search wrapped under OR inside AND', async () => {
    await findUsers({ username: 'alice', email: 'foo@', page: 1, perPage: 10 });
    const where = (mockedFindMany.mock.calls[mockedFindMany.mock.calls.length - 1][0] as {
      where: unknown;
    }).where as {
      AND: Array<{ OR?: Array<{ name?: unknown; email?: unknown }> }>;
    };
    const orClause = where.AND.find((c) => c.OR);
    expect(orClause).toBeDefined();
    expect(orClause!.OR!.length).toBe(2); // name + email search
  });

  it('paginates by skip + take', async () => {
    await findUsers({ username: '', email: '', page: 3, perPage: 25 });
    const args = mockedFindMany.mock.calls[mockedFindMany.mock.calls.length - 1][0] as {
      skip: number;
      take: number;
    };
    expect(args.skip).toBe(2 * 25); // (3 - 1) * 25
    expect(args.take).toBe(25);
  });

  it('page=1 with default perPage skip is 0', async () => {
    await findUsers({ username: '', email: '', page: 1, perPage: 10 });
    const args = mockedFindMany.mock.calls[mockedFindMany.mock.calls.length - 1][0] as {
      skip: number;
    };
    expect(args.skip).toBe(0);
  });
});
