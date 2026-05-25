import { expect, test } from '@playwright/test';

import { prisma } from '@documenso/prisma';
import {
  resetAllBizRethinkSingletons,
  seedInstanceStorageConfig,
} from '@documenso/prisma/seed/bizrethink';

import { signedInAsAdmin } from '../fixtures/bizrethink-auth';

/**
 * E6 from COVERAGE-PLAN-2026-05-25.md — admin storage config.
 * Route: /admin/storage (overlay 013 underlying).
 */
test.describe('BizRethink admin storage config', () => {
  test.beforeEach(async () => {
    await resetAllBizRethinkSingletons();
  });

  test('admin can navigate to /admin/storage and the page renders', async ({ page }) => {
    await signedInAsAdmin({ page, redirectPath: '/admin/storage' });
    await expect(page.getByText('Storage Config').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/storage transport/i).first()).toBeVisible();
  });

  test('seeded storage config persists in DB with encrypted credentials', async ({ page }) => {
    await seedInstanceStorageConfig({
      transport: 's3',
      s3Endpoint: 'https://s3.example.com',
      s3Region: 'us-east-1',
      s3Bucket: 'pacta-docs-test',
      s3AccessKeyId: 'AKIATESTEXAMPLE',
      s3SecretAccessKey: 'super-secret-test-key',
    });

    const row = await prisma.bizrethinkInstanceStorageConfig.findUnique({
      where: { id: 'singleton' },
    });
    expect(row).not.toBeNull();
    expect(row!.transport).toBe('s3');
    expect(row!.s3Endpoint).toBe('https://s3.example.com');
    expect(row!.s3Bucket).toBe('pacta-docs-test');
    expect(row!.s3AccessKeyId).not.toBe('AKIATESTEXAMPLE');
    expect(row!.s3SecretAccessKey).not.toBe('super-secret-test-key');

    await signedInAsAdmin({ page, redirectPath: '/admin/storage' });
    await expect(page.getByText('Storage Config').first()).toBeVisible();
  });
});
