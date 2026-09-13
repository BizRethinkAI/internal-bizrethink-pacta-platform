import { randomUUID } from 'node:crypto';

import { contentFor } from '@bizrethink/customizations/mca/catalogue';
import { mcaClauseFingerprint, mcaLibraryFingerprint } from '@bizrethink/customizations/mca/clauses/approval';
import { NEXT_PUBLIC_WEBAPP_URL } from '@documenso/lib/constants/app';
import { prisma } from '@documenso/prisma';
import { seedUser } from '@documenso/prisma/seed/users';
import { dataTransformer } from '@documenso/trpc/utils/data-transformer';
import { expect, test } from '@playwright/test';

import { apiSignin } from '../fixtures/authentication';
import { signedInAsAdmin } from '../fixtures/bizrethink-auth';

test('one MCA workspace separates numbered clauses, reusable content and read-only disclosures', async ({ page }) => {
  await signedInAsAdmin({ page, redirectPath: '/admin/mca-library' });
  const nav = page.getByRole('navigation', { name: 'MCA workspace' });
  await expect(page.getByRole('heading', { name: 'MCA Clauses', exact: true })).toBeVisible();
  await expect(page.locator('[data-mca-kind="clause"]')).toHaveCount(210);
  await expect(page.locator('[data-mca-kind]:not([data-mca-kind="clause"])')).toHaveCount(0);
  const numbers = await page.locator('[data-mca-number]').allTextContents();
  expect(numbers).toHaveLength(210);
  expect(numbers.every((number) => /^\d+\.\d+$/.test(number.trim()))).toBe(true);
  await expect(page.getByRole('button', { name: /Merchant and Funding Information/ })).toHaveCount(0);

  await nav.getByRole('link', { name: 'Reusable content', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'MCA Reusable content', exact: true })).toBeVisible();
  await expect(page.locator('[data-mca-kind]')).toHaveCount(25);
  await expect(page.locator('[data-mca-number]')).toHaveCount(0);
  await expect(page.locator('[data-mca-slug="frpa.execution-fields"]')).toContainText(
    'New fields — review pending. Source provisions:',
  );
  const funding = page.locator('[data-mca-slug="frpa.merchant-and-funding-information"]');
  await funding.getByRole('button').first().click();
  await expect(funding.getByText('{{field:funding.purchasePrice}}', { exact: true })).toBeVisible();
  await expect(page.getByText('Interview guidance — excluded from contracts', { exact: true })).toHaveCount(2);

  await nav.getByRole('link', { name: 'Disclosures & requirements', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/mca$/);
  await expect(page.getByRole('heading', { name: 'MCA disclosures & requirements', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /approv/i })).toHaveCount(0);
  await nav.getByRole('link', { name: 'Clauses', exact: true }).click();
  await expect(page.locator('[data-mca-kind="clause"]')).toHaveCount(210);
});

test('ordinary members cannot load either MCA authored-content catalogue or the disclosure view', async ({ page }) => {
  const { user } = await seedUser();
  await apiSignin({ page, email: user.email });
  for (const path of ['/admin/mca-library', '/admin/mca-library?catalogue=reusable', '/admin/mca']) {
    // The existing parent admin layout redirects before the leaf's 404 is shown.
    const response = await page.request.get(`${NEXT_PUBLIC_WEBAPP_URL()}${path}`, { maxRedirects: 0 });
    expect(response.status()).toBe(302);
    expect(response.headers().location).toBe('/');
    await page.goto(`${NEXT_PUBLIC_WEBAPP_URL()}${path}`);
    await expect(page).not.toHaveURL(/\/admin(?:\/|$)/);
    await expect(page.locator('[data-mca-kind]')).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: 'MCA workspace' })).toHaveCount(0);
  }
});

test('counsel can review extracted fields and an original unresolved finding still blocks their approval', async ({
  page,
  browser,
}) => {
  const { user } = await signedInAsAdmin({ page, redirectPath: '/admin/mca-library' });
  const id = randomUUID();
  const token = randomUUID();
  const entries = contentFor('frpa');
  const fields = entries.find((entry) => entry.slug === 'frpa.guarantor-fields');
  expect(fields).toBeDefined();
  if (!fields) {
    throw new Error('Guarantor fields are required for this regression.');
  }
  await prisma.bizrethinkMcaLibraryReview.create({
    data: {
      id,
      token,
      instrument: 'frpa',
      createdByUserId: user.id,
      reviewerName: 'Synthetic review counsel',
      reviewerEmail: 'counsel@example.invalid',
      libraryFingerprint: mcaLibraryFingerprint(entries),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      findings: {
        create: {
          id: randomUUID(),
          clauseSlug: 'frpa.guarantor-information-9-1',
          body: 'Synthetic unresolved execution-capacity objection.',
          authorName: 'Synthetic review counsel',
          authorEmail: 'counsel@example.invalid',
          clauseFingerprint: 'historical-source-fingerprint',
        },
      },
    },
  });
  const counselContext = await browser.newContext();
  try {
    const counsel = await counselContext.newPage();
    await counsel.goto(`${NEXT_PUBLIC_WEBAPP_URL()}/mca-clause-review/${token}`);
    const fieldBlock = counsel.locator('[data-mca-slug="frpa.guarantor-fields"]');
    await expect(fieldBlock.getByText('{{field:guarantor.signature}}', { exact: true })).toBeVisible();
    await expect(fieldBlock.getByText('Required for an entity guarantor', { exact: true })).toHaveCount(2);
    await expect(counsel.getByRole('button', { name: /approv/i })).toHaveCount(0);

    const response = await page.request.post(
      `${NEXT_PUBLIC_WEBAPP_URL()}/api/trpc/bizrethink.mcaClauseLibrary.approve`,
      {
        data: dataTransformer.serialize({
          clauseSlug: fields.slug,
          fingerprint: mcaClauseFingerprint(fields),
          approvedByName: 'Synthetic approval attempt',
          approvedByBarNumber: null,
          barJurisdiction: 'US-NY',
        }),
      },
    );
    expect(response.ok()).toBe(false);
    expect(await response.text()).toContain('Counsel recorded a finding against this clause through a review link');
    expect(await prisma.bizrethinkMcaClauseApproval.count({ where: { recordedByUserId: user.id } })).toBe(0);

    const outside = await counsel.request.post(
      `${NEXT_PUBLIC_WEBAPP_URL()}/api/trpc/bizrethink.mcaClauseLibrary.recordFinding`,
      {
        data: dataTransformer.serialize({
          token,
          clauseSlug: 'equipment-lease.guarantor-information',
          body: 'Out of scope.',
        }),
      },
    );
    expect(outside.ok()).toBe(false);
    expect(await prisma.bizrethinkMcaLibraryFinding.count({ where: { reviewId: id } })).toBe(1);
  } finally {
    await counselContext.close();
    await prisma.bizrethinkMcaLibraryReview.delete({ where: { id } });
    await prisma.bizrethinkMcaClauseApproval.deleteMany({ where: { recordedByUserId: user.id } });
  }
});
