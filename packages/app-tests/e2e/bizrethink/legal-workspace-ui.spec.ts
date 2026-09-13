import { randomUUID } from 'node:crypto';
import { jurisdictionLabel } from '@bizrethink/customizations/lease/clauses/approval-jurisdiction';
import { libraryFor } from '@bizrethink/customizations/lease/clauses/library';
import { contentFor } from '@bizrethink/customizations/mca/catalogue';
import { readingForReview } from '@bizrethink/customizations/mca/review/reading-presentation';
import { NEXT_PUBLIC_WEBAPP_URL } from '@documenso/lib/constants/app';
import { prisma } from '@documenso/prisma';
import { expect, test } from '@playwright/test';
import { signedInAsAdmin } from '../fixtures/bizrethink-auth';

test('references open their actual selection target and return to the exact passage', async ({ page }, testInfo) => {
  await signedInAsAdmin({ page, redirectPath: '/admin/mca-library' });
  const source = contentFor('frpa').find((item) => {
    if (item.kind !== 'clause') {
      return false;
    }
    const reference = readingForReview(item.slug).segments.find((part) => part.kind === 'reference');
    return (
      reference?.kind === 'reference' &&
      readingForReview(reference.targetSlug, undefined, reference.context).segments.some(
        (part) => part.kind === 'reference',
      )
    );
  });
  expect(source).toBeDefined();
  if (!source) {
    throw new Error('The FRPA must contain internal references.');
  }
  const reference = readingForReview(source.slug).segments.find((part) => part.kind === 'reference');
  if (!reference || reference.kind !== 'reference') {
    throw new Error('Missing reference fixture.');
  }
  await page.goto(`${NEXT_PUBLIC_WEBAPP_URL()}/admin/mca-library?instrument=frpa&item=${source.slug}`);
  await expect(page.locator(`[data-mca-slug="${source.slug}"] .font-serif`)).toHaveCSS('font-size', '17px');
  const origin = page
    .locator(`[data-mca-slug="${source.slug}"]`)
    .getByRole('button', { name: /open reference$/ })
    .first();
  const originId = await origin.getAttribute('id');
  await page.waitForLoadState('networkidle');
  await origin.click();
  const peek = page.getByRole('dialog');
  await expect(peek).toBeVisible();
  await expect(peek).toContainText('Citation context');
  await expect(peek.getByRole('button', { name: /open reference$/ }).first()).toBeVisible();
  await peek
    .getByRole('button', { name: /open reference$/ })
    .first()
    .click();
  await peek.getByRole('button', { name: 'Back to previous reference', exact: true }).click();
  await peek.getByRole('button', { name: 'Open in reading context', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`item=${reference.targetSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  await expect(page.locator(`[data-mca-slug="${reference.targetSlug}"]`).getByRole('button').first()).toBeFocused();
  await page.getByRole('button', { name: 'Return to passage', exact: true }).click();
  await expect(page.locator(`[id="${originId}"]`)).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath('mca-clause-reading.png'), fullPage: false });
});

test('lease membership, disclosure details and mobile reading remain usable in the single admin shell', async ({
  page,
}, testInfo) => {
  const { organisation } = await signedInAsAdmin({ page, redirectPath: '/admin' });
  const grant = await prisma.bizrethinkFeatureAccess.create({
    data: {
      id: randomUUID(),
      feature: 'lease-builder',
      scope: 'organisation',
      scopeId: organisation.id,
      enabled: true,
    },
  });
  try {
    await page.reload();
    await page.waitForLoadState('networkidle');
    const viewports = [
      { width: 1280, height: 900 },
      { width: 768, height: 1024 },
      { width: 390, height: 844 },
    ];
    const shellWidths = new Map<number, number>();
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      shellWidths.set(viewport.width, await page.evaluate(() => document.documentElement.scrollWidth));
    }
    await page.setViewportSize(viewports[0]);

    await page.goto(`${NEXT_PUBLIC_WEBAPP_URL()}/admin/lease-library`);
    for (const { jurisdiction, name } of [
      { jurisdiction: 'US-FL', name: /^Florida ·/ },
      { jurisdiction: 'US-NC', name: /^North Carolina ·/ },
    ] as const) {
      await page.getByRole('button', { name }).click();
      const expectedClauses = libraryFor(jurisdiction);
      await expect(page.locator('[data-lease-slug]')).toHaveCount(expectedClauses.length);
      for (const clause of expectedClauses) {
        await expect(
          page
            .locator(`[data-lease-slug="${clause.slug}"]`)
            .getByText(jurisdictionLabel(clause.jurisdiction), { exact: true }),
        ).toBeVisible();
      }
      await expect(page.getByLabel('Approval coverage jurisdiction')).toHaveValue(jurisdiction);
    }
    await page.getByRole('button', { name: /^Shared clauses ·/ }).click();
    const nc = new Set(libraryFor('US-NC').map((item) => item.slug));
    await expect(page.locator('[data-lease-slug]')).toHaveCount(
      libraryFor('US-FL').filter((item) => nc.has(item.slug)).length,
    );
    await expect(page.getByLabel('Approval coverage jurisdiction')).toHaveValue('US-NC');
    const firstClause = page.locator('[data-lease-slug]').first();
    await firstClause.getByRole('button').first().click();
    await expect(firstClause.getByRole('button').first()).toHaveAttribute('aria-expanded', 'true');
    await expect(firstClause.locator('.font-serif')).toHaveCSS('font-size', '17px');
    await page.screenshot({ path: testInfo.outputPath('lease-library.png'), fullPage: false });
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      // The pre-existing admin header overflows at 768px; the legal workspace must fit
      // its own viewport and must not increase the shell's measured scroll width.
      const bounds = await page.locator('[data-legal-workspace]').first().boundingBox();
      expect(bounds).not.toBeNull();
      expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(viewport.width + 1);
      const overflow = await page.evaluate(() =>
        [...document.querySelectorAll('body *')]
          .filter((element) => element.getBoundingClientRect().right > window.innerWidth + 1)
          .map((element) => ({
            tag: element.tagName,
            class: element.className,
            right: element.getBoundingClientRect().right,
          })),
      );
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
        JSON.stringify({ viewport, overflow }),
      ).toBeLessThanOrEqual(shellWidths.get(viewport.width) ?? viewport.width);
    }
    await page.goto(`${NEXT_PUBLIC_WEBAPP_URL()}/admin/mca`);
    await page.locator('[data-disclosure="ca-offer-summary"] > summary').click();
    await page
      .locator('[data-disclosure="ca-offer-summary"]')
      .getByRole('link', { name: 'Read source & coverage details' })
      .click();
    await expect(page.getByRole('heading', { name: 'Rows, lines & requirements' })).toBeVisible();
    await expect(page.getByText('Scoped source passage', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /approv/i })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('disclosure-mobile.png'), fullPage: false });
    await page.getByRole('button', { name: 'Document checks', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Document check availability' })).toBeVisible();
    await expect(page.getByText(/They are not results from a filled transaction/)).toBeVisible();
  } finally {
    await prisma.bizrethinkFeatureAccess.delete({ where: { id: grant.id } });
  }
});

test('counsel reads full business alternatives and retains finding drafts while navigating', async ({
  page,
  browser,
}, testInfo) => {
  const { user } = await signedInAsAdmin({ page, redirectPath: '/admin/mca-library' });
  const entries = contentFor('frpa');
  await page.locator('summary').filter({ hasText: 'Review links & counsel findings' }).click();
  await page.getByRole('button', { name: 'Send one to counsel', exact: true }).click();
  await page.locator('#mca-counsel-name').fill('Synthetic legal UI reviewer');
  await page.locator('#mca-counsel-email').fill('ui-review@example.invalid');
  await page.getByRole('button', { name: 'Create the link', exact: true }).click();
  await expect(page.getByText('Synthetic legal UI reviewer', { exact: true })).toBeVisible();
  const review = await prisma.bizrethinkMcaLibraryReview.findFirst({
    where: { createdByUserId: user.id, instrument: 'frpa' },
  });
  expect(review).not.toBeNull();
  if (!review) {
    throw new Error('The review-link form must persist the scoped review.');
  }
  const { id, token } = review;
  const context = await browser.newContext();
  try {
    const counsel = await context.newPage();
    await counsel.goto(`${NEXT_PUBLIC_WEBAPP_URL()}/mca-clause-review/${token}`);
    await expect(counsel.getByRole('heading', { name: 'Review brief', exact: true })).toBeVisible();
    await expect(counsel.getByText(/This review content has changed since the link was sent/)).toHaveCount(0);
    await expect(counsel.getByRole('complementary', { name: 'Review index' }).locator('..')).toHaveCSS(
      'grid-template-columns',
      /^250px /,
    );
    await counsel.getByRole('button', { name: 'Decisions', exact: true }).click();
    await counsel.getByRole('button', { name: 'Guaranty Scope', exact: true }).click();
    const options = entries.filter(
      (entry) => entry.variance.kind === 'offered' && entry.variance.fact === 'guarantyScope',
    );
    for (const option of options) {
      await expect(counsel.locator(`[data-mca-slug="${option.slug}"]`)).toBeVisible();
    }
    await expect(counsel.locator('[data-mca-slug] .font-serif').first()).toHaveCSS('font-size', '17px');
    await counsel.screenshot({ path: testInfo.outputPath('counsel-alternatives.png'), fullPage: false });
    const first = counsel.locator(`[data-mca-slug="${options[0].slug}"]`);
    await first.locator('summary').filter({ hasText: 'Findings on this item' }).click();
    await first.getByRole('textbox').fill('Synthetic finding draft survives subject navigation.');
    await counsel.getByRole('button', { name: 'Review brief', exact: true }).click();
    await counsel.getByRole('button', { name: 'Guaranty Scope', exact: true }).click();
    await first.locator('summary').filter({ hasText: 'Findings on this item' }).click();
    await expect(first.getByRole('textbox')).toHaveValue('Synthetic finding draft survives subject navigation.');
    await first.getByRole('button', { name: 'Record a finding', exact: true }).click();
    await expect(first.getByText('Finding recorded', { exact: true })).toBeVisible();
    await counsel.reload();
    await first.locator('summary').filter({ hasText: 'Findings on this item' }).click();
    await expect(
      first.getByText('Synthetic finding draft survives subject navigation.', { exact: true }),
    ).toBeVisible();
    await counsel.setViewportSize({ width: 390, height: 844 });
    expect(await counsel.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await counsel.getByRole('button', { name: 'Index', exact: true }).click();
    await expect(counsel.getByRole('complementary', { name: 'Review index' })).toBeVisible();
    await counsel.screenshot({ path: testInfo.outputPath('counsel-mobile-index.png'), fullPage: false });
  } finally {
    await context.close();
    await prisma.bizrethinkMcaLibraryReview.delete({ where: { id } });
  }
});
