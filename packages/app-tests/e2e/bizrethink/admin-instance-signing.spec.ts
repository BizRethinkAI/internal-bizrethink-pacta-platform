import { expect, test } from '@playwright/test';

import { prisma } from '@documenso/prisma';
import {
  resetAllBizRethinkSingletons,
  seedInstanceSigningConfig,
} from '@documenso/prisma/seed/bizrethink';

import { signedInAsAdmin } from '../fixtures/bizrethink-auth';

/**
 * E5 from COVERAGE-PLAN-2026-05-25.md — admin signing config.
 * Route: /admin/signing (overlay 011a + 011b underlying).
 */
test.describe('BizRethink admin signing config', () => {
  test.beforeEach(async () => {
    await resetAllBizRethinkSingletons();
  });

  test('admin can navigate to /admin/signing and the page renders', async ({ page }) => {
    await signedInAsAdmin({ page, redirectPath: '/admin/signing' });
    await expect(page.getByText('Signing Config').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/signing transport/i).first()).toBeVisible();
  });

  test('seeded signing config persists in DB with encrypted fields', async ({ page }) => {
    await seedInstanceSigningConfig({
      transport: 'local',
      localPassphrase: 'test-passphrase',
      tsaUrls: ['https://tsa.example.com'],
      signingContactInfo: 'compliance@bizrethink.ai',
    });

    const row = await prisma.bizrethinkInstanceSigningConfig.findUnique({
      where: { id: 'singleton' },
    });
    expect(row).not.toBeNull();
    expect(row!.transport).toBe('local');
    expect(row!.signingContactInfo).toBe('compliance@bizrethink.ai');
    expect(row!.tsaUrls).toBe('https://tsa.example.com');
    expect(row!.localPassphrase).not.toBe('test-passphrase');
    expect(row!.localPassphrase).toMatch(/^[A-Za-z0-9+/=:_-]+$/);

    await signedInAsAdmin({ page, redirectPath: '/admin/signing' });
    await expect(page.getByText('Signing Config').first()).toBeVisible();
  });
});
