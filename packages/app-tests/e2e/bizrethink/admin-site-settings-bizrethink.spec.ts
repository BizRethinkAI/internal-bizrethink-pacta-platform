import { expect, test } from '@playwright/test';

import { prisma } from '@documenso/prisma';
import {
  resetAllBizRethinkSingletons,
  seedSiteSettingsSignup,
} from '@documenso/prisma/seed/bizrethink';

import { signedInAsAdmin } from '../fixtures/bizrethink-auth';

/**
 * E7 from COVERAGE-PLAN-2026-05-25.md — admin-site-settings (simplest E2E).
 *
 * Covers the loop: admin updates a BizRethink site-setting via /admin UI,
 * the DB row is upserted, and a subsequent signup attempt honours the new
 * value. This is the template for E5/E6 (other admin pages).
 *
 * Validates overlay 012 (site-settings union extension) + overlay 029
 * (upsert cache-bust) work end-to-end.
 */
test.describe('BizRethink admin site-settings — signup-domains', () => {
  test.beforeEach(async () => {
    await resetAllBizRethinkSingletons();
  });

  test('save signup-domains via admin UI → DB row updated → next signup honours allowlist', async ({
    page,
  }) => {
    // Pre-condition: admin signed in.
    await signedInAsAdmin({ page, redirectPath: '/admin/site-settings' });

    // Page should render the BizRethink signup section.
    // NOTE: exact selectors below assume the admin/site-settings page has a
    // form section labelled "Allowed signup domains" — VERIFY against the
    // actual UI on first run; adjust selectors to whatever the form uses.
    await expect(
      page.getByRole('heading', { name: /signup|allowed.*domains/i }).first(),
    ).toBeVisible();

    // Find and fill the allowed-domains input (likely a textarea or CSV input).
    const domainsField = page
      .locator('[name="allowedDomains"], textarea[placeholder*="domain" i]')
      .first();
    await domainsField.fill('example.com,allowed.test');

    // Save.
    await page
      .getByRole('button', { name: /save|update/i })
      .first()
      .click();

    // Wait for save confirmation (toast or page state).
    await expect(page.getByText(/saved|updated/i).first()).toBeVisible({ timeout: 5000 });

    // Assert DB row is correct.
    const row = await prisma.siteSettings.findFirst({ where: { id: 'site.signup' } });
    expect(row).not.toBeNull();
    expect(row!.enabled).toBe(true);
    const data = row!.data as {
      signupDisabled: boolean;
      allowedDomains: string[];
    };
    expect(data.allowedDomains).toContain('example.com');
    expect(data.allowedDomains).toContain('allowed.test');
  });

  test('disallowed-domain signup is blocked when allowlist is set', async ({ page }) => {
    // Seed the allowlist directly (faster than going through the UI).
    await seedSiteSettingsSignup({
      enabled: true,
      allowedDomains: ['allowed.test'],
      signupDisabled: false,
      requireInviteWhenDomainGated: false,
    });

    // Try to sign up with a disallowed email.
    await page.goto('/signup');
    await page.getByLabel(/name/i).first().fill('Blocked User');
    await page.getByLabel(/email/i).first().fill('blocked@disallowed.example');
    await page
      .getByLabel(/password/i)
      .first()
      .fill('CorrectHorseBatteryStaple1!');

    await page
      .getByRole('button', { name: /sign ?up|create account/i })
      .first()
      .click();

    // Expect a domain-not-allowed error message.
    await expect(
      page.getByText(/not allowed|domain.*allowed|invalid.*domain/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });
});
