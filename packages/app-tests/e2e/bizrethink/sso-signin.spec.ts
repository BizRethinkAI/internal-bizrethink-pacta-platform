import { expect, test } from '@playwright/test';

import { prisma } from '@documenso/prisma';
import {
  resetAllBizRethinkSingletons,
  seedSsoProviderConfig,
} from '@documenso/prisma/seed/bizrethink';
import { seedUser } from '@documenso/prisma/seed/users';

import { signedInAsAdmin } from '../fixtures/bizrethink-auth';

/**
 * SSO kill switch (overlay 071, 2026-09 incident).
 *
 * SSO — Google, Microsoft, generic OIDC and the per-organisation
 * authentication portal — is removed from this build by a code-level switch
 * (packages/bizrethink/feature-flags.ts → isSsoDisabledByBuild). No DB row or
 * env var may turn it back on.
 *
 * This file used to be a skipped skeleton (test.describe.skip) planning tests
 * that SSO *works*. That behaviour no longer exists, so every test here seeds
 * a fully configured, ENABLED provider or portal and asserts it stays dead.
 * Unit coverage: sso-provider-config.test.ts and
 * regression-tests/sso-kill-switch.test.ts.
 */
test.describe('BizRethink overlay 071 — SSO is disabled in this build', () => {
  test.beforeEach(async () => {
    await resetAllBizRethinkSingletons();
  });

  test.afterEach(async () => {
    await resetAllBizRethinkSingletons();
  });

  const seedAllProvidersEnabled = async () => {
    await seedSsoProviderConfig({
      provider: 'google',
      enabled: true,
      clientId: 'fake-google-client-id',
      clientSecret: 'fake-google-client-secret',
    });
    await seedSsoProviderConfig({
      provider: 'microsoft',
      enabled: true,
      clientId: 'fake-microsoft-client-id',
      clientSecret: 'fake-microsoft-client-secret',
    });
    await seedSsoProviderConfig({
      provider: 'oidc',
      enabled: true,
      clientId: 'fake-oidc-client-id',
      clientSecret: 'fake-oidc-client-secret',
      oidcWellKnownUrl: 'https://idp.example.com/.well-known/openid-configuration',
      oidcProviderLabel: 'Example IDP',
    });
  };

  test('/signin shows no SSO buttons even with every provider enabled in the DB', async ({ page }) => {
    await seedAllProvidersEnabled();

    await page.goto('/signin');
    await expect(page.getByLabel('Email')).toBeVisible();

    await expect(page.getByRole('button', { name: 'Google' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Microsoft' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Example IDP' })).toHaveCount(0);
  });

  test('OAuth authorize endpoints refuse every provider even with enabled DB rows', async ({ request }) => {
    await seedAllProvidersEnabled();

    for (const provider of ['google', 'microsoft', 'oidc'] as const) {
      const res = await request.post(`/api/auth/oauth/authorize/${provider}`, { data: {} });
      expect(res.ok(), `${provider} authorize must not succeed`).toBe(false);
    }
  });

  test('admin SSO providers page shows the disabled notice, not the config form', async ({ page }) => {
    await signedInAsAdmin({ page, redirectPath: '/admin/sso-providers' });

    await expect(page.getByText('SSO is disabled in this build.')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByLabel('Client secret')).toHaveCount(0);
  });

  test('org authentication portal sign-in is a 404 even when fully configured', async ({ page }) => {
    const { organisation } = await seedUser();

    const claim = await prisma.organisationClaim.findFirstOrThrow({
      where: { organisation: { id: organisation.id } },
    });

    await prisma.organisation.update({
      where: { id: organisation.id },
      data: {
        organisationClaim: {
          update: {
            flags: { ...(claim.flags as Record<string, unknown>), authenticationPortal: true },
          },
        },
        organisationAuthenticationPortal: {
          update: {
            enabled: true,
            clientId: 'fake-portal-client-id',
            clientSecret: 'fake-portal-client-secret',
            wellKnownUrl: 'https://idp.example.com/.well-known/openid-configuration',
          },
        },
      },
    });

    const response = await page.goto(`/o/${organisation.url}/signin`);

    expect(response?.status()).toBe(404);
    await expect(page.getByText('Authentication Portal Not Found')).toBeVisible();
  });
});
