import { prisma } from '@documenso/prisma';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Relative, not '@documenso/auth/...': a package-name import resolves through
// node_modules, which in a git worktree can point at another checkout's
// sources — the test would then pass or fail against code that isn't this one.
import { getOrganisationAuthenticationPortalOptions } from '../../auth/server/lib/utils/organisation-portal';
import { ssoProviderRouter } from '../server-only/trpc/sso-provider-router';

// 2026-09 incident: SSO (Google, Microsoft, generic OIDC and the per-org
// authentication portal) is removed from this build. These tests pin the
// removal at the two places a configured row could otherwise revive it that
// do NOT go through getProviderConfig (covered in sso-provider-config.test.ts):
//
//   1. getOrganisationAuthenticationPortalOptions (upstream, overlay 071) — reads
//      OrganisationAuthenticationPortal directly and feeds the org OIDC
//      authorize/callback routes and link-organisation-account.
//   2. The admin SSO provider router — must refuse to save provider config.
//
// Each "switch ON" test has a "switch OFF" control on the same fixture, so a
// green ON test proves the kill switch is the reason, not a broken fixture.

const killSwitch = vi.hoisted(() => ({ disabled: true }));

vi.mock('../feature-flags', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../feature-flags')>()),
  isSsoDisabledByBuild: () => killSwitch.disabled,
}));

// The upstream getter reaches the switch by package name (dynamic import). In
// a normal checkout this is the same file as '../feature-flags'; mocking the
// specifier too keeps the switch under test control wherever it resolves.
vi.mock('@bizrethink/customizations/feature-flags', () => ({
  isSsoDisabledByBuild: () => killSwitch.disabled,
}));

vi.mock('@documenso/prisma', () => ({
  prisma: {
    organisation: { findFirst: vi.fn() },
    bizrethinkSsoProvider: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

// Billing ON so the portal getter's own billing guard does not throw first —
// otherwise the ON test would pass for the wrong reason.
vi.mock('@documenso/lib/constants/app', () => ({
  IS_BILLING_ENABLED: () => true,
  NEXT_PUBLIC_WEBAPP_URL: () => 'https://pacta.test',
}));

vi.mock('@documenso/lib/constants/crypto', () => ({
  DOCUMENSO_ENCRYPTION_KEY: 'test-encryption-key',
}));

vi.mock('@documenso/lib/universal/crypto', () => ({
  symmetricEncrypt: vi.fn(({ data }: { data: string }) => `enc:${data}`),
  symmetricDecrypt: vi.fn(({ data }: { data: string }) =>
    new TextEncoder().encode(data.startsWith('enc:') ? data.slice(4) : data),
  ),
}));

vi.mock('@documenso/lib/utils/env', () => ({ env: vi.fn() }));

// Minimal tRPC stand-in: each procedure chain resolves to its handler, and
// router() returns the record, so the mutation can be called directly.
vi.mock('@documenso/trpc/server/trpc', () => {
  const builder: Record<string, unknown> = {};
  builder.input = () => builder;
  builder.output = () => builder;
  builder.query = (fn: unknown) => fn;
  builder.mutation = (fn: unknown) => fn;
  return { adminProcedure: builder, router: (r: unknown) => r };
});

const mockedFindFirst = vi.mocked(prisma.organisation.findFirst);
const mockedUpsert = vi.mocked(prisma.bizrethinkSsoProvider.upsert);

const fullyConfiguredPortalOrg = () => ({
  id: 'org_1',
  url: 'acme',
  organisationClaim: { flags: { authenticationPortal: true } },
  organisationAuthenticationPortal: {
    enabled: true,
    clientId: 'portal-client-id',
    clientSecret: 'enc:portal-client-secret',
    wellKnownUrl: 'https://idp.acme.test/.well-known/openid-configuration',
  },
  groups: [],
});

type UpdateHandler = (opts: { input: Record<string, unknown>; ctx: { user: { id: number } } }) => Promise<unknown>;

const callUpdate = async () =>
  (ssoProviderRouter.update as unknown as UpdateHandler)({
    input: {
      provider: 'google',
      enabled: true,
      clientId: 'google-id',
      clientSecret: 'google-secret',
      oidcWellKnownUrl: '',
      oidcProviderLabel: '',
      oidcSkipVerify: false,
      oidcPrompt: '',
    },
    ctx: { user: { id: 1 } },
  });

beforeEach(() => {
  vi.clearAllMocks();
  killSwitch.disabled = true;
});

describe('isSsoDisabledByBuild — shipped default', () => {
  it('is ON in this build (SSO removed after the 2026-09 incident)', async () => {
    const actual = await vi.importActual<typeof import('../feature-flags')>('../feature-flags');
    expect(actual.isSsoDisabledByBuild()).toBe(true);
  });
});

describe('getOrganisationAuthenticationPortalOptions (overlay 071)', () => {
  it('control: with the switch OFF, the fixture is a fully working portal', async () => {
    killSwitch.disabled = false;
    mockedFindFirst.mockResolvedValue(fullyConfiguredPortalOrg() as never);

    const result = await getOrganisationAuthenticationPortalOptions({ type: 'url', organisationUrl: 'acme' });

    expect(result.clientOptions.clientId).toBe('portal-client-id');
    expect(result.clientOptions.clientSecret).toBe('portal-client-secret');
  });

  it('throws NOT_SETUP for a fully configured, enabled portal when the switch is ON', async () => {
    mockedFindFirst.mockResolvedValue(fullyConfiguredPortalOrg() as never);

    await expect(
      getOrganisationAuthenticationPortalOptions({ type: 'url', organisationUrl: 'acme' }),
    ).rejects.toMatchObject({ code: 'NOT_SETUP', message: expect.stringMatching(/SSO is disabled/) });
  });

  it('refuses before touching the DB (by id, too)', async () => {
    mockedFindFirst.mockResolvedValue(fullyConfiguredPortalOrg() as never);

    await expect(
      getOrganisationAuthenticationPortalOptions({ type: 'id', organisationId: 'org_1' }),
    ).rejects.toMatchObject({ code: 'NOT_SETUP' });
    expect(mockedFindFirst).not.toHaveBeenCalled();
  });
});

describe('ssoProviderRouter.update', () => {
  it('control: with the switch OFF, a save is written', async () => {
    killSwitch.disabled = false;

    await expect(callUpdate()).resolves.toEqual({ ok: true });
    expect(mockedUpsert).toHaveBeenCalledTimes(1);
  });

  it('refuses to save provider config when the switch is ON', async () => {
    await expect(callUpdate()).rejects.toMatchObject({
      code: 'NOT_SETUP',
      message: expect.stringMatching(/SSO is disabled/),
    });
    expect(mockedUpsert).not.toHaveBeenCalled();
  });
});
