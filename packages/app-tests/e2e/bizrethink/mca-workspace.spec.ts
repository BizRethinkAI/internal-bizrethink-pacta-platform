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

test('one MCA workspace separates numbered clauses, reusable content and read-only disclosures', async ({
  page,
}, testInfo) => {
  await signedInAsAdmin({ page, redirectPath: '/admin/mca-library' });
  const nav = page.getByRole('navigation', { name: 'MCA workspace' });
  await expect(page.getByRole('heading', { name: 'MCA Clauses', exact: true })).toBeVisible();
  await expect(page.locator('[data-mca-kind="clause"]')).toHaveCount(210);
  await expect(page.locator('[data-mca-kind]:not([data-mca-kind="clause"])')).toHaveCount(0);
  const numbers = await page.locator('[data-mca-number]').allTextContents();
  expect(numbers).toHaveLength(210);
  expect(numbers.every((number) => /^\d+\.\d+$/.test(number.trim()))).toBe(true);
  const fundingSection = page.locator('[data-mca-section="funding-terms"]');
  await expect(fundingSection.getByRole('heading', { name: '1. Funding Terms', exact: true })).toBeVisible();
  await expect(fundingSection.locator('[data-mca-slug="frpa.holdback-explainer"] [data-mca-number]')).toHaveText('1.1');
  await fundingSection.screenshot({ path: testInfo.outputPath('mca-funding-section.png') });
  await expect(page.getByRole('button', { name: /Merchant and Funding Information/ })).toHaveCount(0);
  await page.getByLabel('Instrument', { exact: true }).selectOption('frpa');
  await expect(page.locator('[data-mca-kind="clause"]')).toHaveCount(
    contentFor('frpa').filter((item) => item.kind === 'clause').length,
  );
  await page.getByLabel('Search library', { exact: true }).fill('no-such-clause-unique');
  await expect(page.locator('[data-mca-kind]')).toHaveCount(0);
  await expect(page.locator('[data-mca-section]')).toHaveCount(0);
  await page.getByLabel('Search library', { exact: true }).fill('Definitions');
  await expect(page.getByRole('heading', { name: '3. Purchase', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await expect(page.locator('[data-mca-kind="clause"]')).toHaveCount(210);

  await nav.getByRole('link', { name: 'Reusable content', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'MCA Reusable content', exact: true })).toBeVisible();
  await expect(page.locator('[data-mca-kind]')).toHaveCount(25);
  await expect(page.locator('[data-mca-number]')).toHaveCount(0);
  const execution = page.locator('[data-mca-slug="frpa.execution-fields"]');
  await execution.getByRole('button').first().click();
  await execution.locator('summary').filter({ hasText: 'Context & provenance' }).click();
  await expect(execution).toContainText('New fields — review pending. Source provisions:');
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

test('a complete neutral counsel package preserves findings, source context and revocation', async ({
  page,
  browser,
}, testInfo) => {
  const { user } = await signedInAsAdmin({ page, redirectPath: '/admin/mca-library' });
  const reviewerName = `Package counsel ${randomUUID()}`;
  const counselContext = await browser.newContext();
  try {
    await page.getByText('Review links & counsel findings', { exact: false }).click();
    await page.getByLabel('Package reviewer name', { exact: true }).fill(reviewerName);
    await page.getByLabel('Package reviewer email', { exact: true }).fill('package-counsel@example.invalid');
    await page.getByLabel('Business review contact', { exact: true }).fill('Legal operations · legal@example.invalid');
    await page.getByRole('button', { name: 'Create complete package link', exact: true }).click();
    const card = page.locator('[data-mca-package-review]').filter({ hasText: reviewerName });
    const link = card.getByRole('link', { name: 'Open saved review', exact: true });
    await expect(link).toBeVisible();
    const href = await link.getAttribute('href');
    const counsel = await counselContext.newPage();
    await counsel.goto(`${NEXT_PUBLIC_WEBAPP_URL()}${href}`);
    await expect(counsel.getByRole('heading', { name: 'Shared MCA library — complete counsel package' })).toBeVisible();
    await expect(counsel.locator('[data-mca-counsel-package]')).not.toContainText('Lombard');
    const index = counsel.getByRole('complementary', { name: 'Review index' });
    await expect(index.locator('..')).toHaveCSS('grid-template-columns', /^250px /);
    await expect(counsel.getByLabel('Review document', { exact: true }).locator('option')).toHaveCount(7);
    await expect(counsel.getByRole('heading', { name: 'Review brief', exact: true })).toBeVisible();
    await expect(counsel.locator('[data-mca-review-brief] > section')).toHaveCount(5);
    const column = await counsel.locator('[data-mca-reading-column]').boundingBox();
    expect(column?.width).toBeLessThan(850);
    await counsel.screenshot({ path: testInfo.outputPath('neutral-complete-counsel-package.png'), fullPage: false });
    await counsel.getByRole('button', { name: 'Start reviewing', exact: true }).click();
    await expect(counsel.getByRole('heading', { name: '1. Funding Terms', exact: true })).toBeVisible();
    await expect(counsel.locator('[data-mca-package-item="frpa.merchant-and-funding-information"]')).toBeVisible();
    await counsel.screenshot({ path: testInfo.outputPath('neutral-counsel-reading-column.png'), fullPage: false });

    const item = counsel.locator('[data-mca-package-item="frpa.holdback-explainer"]');
    await expect(item.locator('.font-serif')).toHaveCSS('font-size', '17px');
    await counsel.getByLabel('Larger text', { exact: true }).check();
    await expect(item.locator('.font-serif')).toHaveCSS('font-size', '20px');
    await counsel.getByLabel('Larger text', { exact: true }).uncheck();
    const reference = item.getByRole('button', { name: /open reference/ }).first();
    await reference.click();
    await expect(counsel.getByRole('dialog')).toContainText('Citation context');
    await counsel.getByRole('button', { name: 'Open in reading context', exact: true }).click();
    await expect(counsel.getByRole('heading', { name: '3. Purchase', exact: true })).toBeVisible();
    await counsel.getByRole('button', { name: 'Return to passage', exact: true }).click();
    await expect(reference).toBeFocused();
    await item.getByText('Findings for this item', { exact: false }).click();
    await item
      .getByLabel('Finding', { exact: true })
      .fill('Synthetic review: reconcile payment wording across the package.');
    await item.getByRole('button', { name: 'Record finding', exact: true }).click();
    await expect(item.getByText('Unanswered — approval held', { exact: true })).toBeVisible();
    await counsel.reload();
    await counsel.getByRole('button', { name: 'Start reviewing', exact: true }).click();
    await item.getByText('Findings for this item', { exact: false }).click();
    await expect(item).toContainText('Synthetic review: reconcile payment wording across the package.');

    await counsel.getByLabel('Search review index', { exact: true }).fill('Processor Fees');
    await index.getByRole('button', { name: /Processor Fees.*Split Funding Authorization/i }).click();
    await expect(counsel.getByLabel('Review document', { exact: true })).toHaveValue('split-funding');
    await expect(counsel.locator('[data-mca-package-item="split-funding.fees-are-additional"]')).toContainText(
      'PAYZLI',
    );
    await counsel.getByLabel('Review document', { exact: true }).selectOption('requirements');
    const source = counsel.locator('[data-mca-review-requirement="va-disclosure"]');
    await source.locator('summary').click();
    await expect(source).toContainText('prescribed-form');
    await expect(source).toContainText('Last source reading:');
    await expect(source.getByRole('link').first()).toBeVisible();
    await counsel.screenshot({ path: testInfo.outputPath('counsel-disclosure-source-context.png'), fullPage: false });
    await counsel.setViewportSize({ width: 390, height: 844 });
    await expect(index).not.toBeVisible();
    await counsel.getByRole('button', { name: 'Index', exact: true }).click();
    await expect(index).toBeVisible();
    await index.scrollIntoViewIfNeeded();
    await counsel.screenshot({ path: testInfo.outputPath('neutral-counsel-mobile-index.png'), fullPage: false });
    await counsel.getByLabel('Review document', { exact: true }).selectOption('frpa');
    await expect(index).not.toBeVisible();
    expect(await counsel.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await counsel.screenshot({ path: testInfo.outputPath('neutral-counsel-mobile-reading.png'), fullPage: false });

    const forged = await counsel.request.post(
      `${NEXT_PUBLIC_WEBAPP_URL()}/api/trpc/bizrethink.mcaPackageReview.recordFinding`,
      {
        data: dataTransformer.serialize({
          token: href?.split('/').pop(),
          targetIds: ['content:outside'],
          body: 'Outside.',
        }),
      },
    );
    expect(forged.ok()).toBe(false);
    const unauthorizedShare = await counsel.request.post(
      `${NEXT_PUBLIC_WEBAPP_URL()}/api/trpc/bizrethink.mcaPackageReview.share`,
      {
        data: dataTransformer.serialize({
          reviewerName: 'Other',
          reviewerEmail: 'other@example.invalid',
          contact: 'Other',
        }),
      },
    );
    expect(unauthorizedShare.ok()).toBe(false);
    await page.reload();
    await page.getByText('Review links & counsel findings', { exact: false }).click();
    await card.getByRole('button', { name: 'Revoke package link', exact: true }).click();
    await expect(card).toContainText('Revoked');
    await counsel.reload();
    await expect(counsel.getByRole('heading', { name: 'Review unavailable', exact: true })).toBeVisible();
  } finally {
    await counselContext.close();
    await prisma.bizrethinkMcaPackageReview.deleteMany({ where: { createdByUserId: user.id } });
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
    await counsel.getByRole('button', { name: 'All', exact: true }).click();
    await counsel.getByRole('button', { name: 'Read all items', exact: true }).click();
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
