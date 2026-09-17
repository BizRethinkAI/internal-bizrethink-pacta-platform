import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { providerFixture } from '@bizrethink/customizations/mca/templates/profile.fixture';
import { emptyMcaDraftInput } from '@bizrethink/customizations/mca/transactions/input';
import { NEXT_PUBLIC_WEBAPP_URL } from '@documenso/lib/constants/app';
import { prisma } from '@documenso/prisma';
import { seedUser } from '@documenso/prisma/seed/users';
import { dataTransformer } from '@documenso/trpc/utils/data-transformer';
import { type APIRequestContext, expect, test } from '@playwright/test';
import { apiSignin } from '../fixtures/authentication';

const post = (request: APIRequestContext, route: string, input: unknown) =>
  request.post(`${NEXT_PUBLIC_WEBAPP_URL()}/api/trpc/bizrethink.mcaTemplates.${route}`, {
    data: dataTransformer.serialize(input),
  });
const pdf = (request: APIRequestContext, input: unknown) =>
  request.post(`${NEXT_PUBLIC_WEBAPP_URL()}/api/bizrethink/mca-draft`, { data: input });
const grant = async (userId: number, feature: string, enabled: boolean) => {
  const key = { feature, scope: 'user', scopeId: String(userId) };
  await prisma.bizrethinkFeatureAccess.upsert({
    where: { feature_scope_scopeId: key },
    create: { id: randomUUID(), ...key, enabled },
    update: { enabled },
  });
};
const cleanup = async (userId: number) => {
  await prisma.bizrethinkMcaDeal.deleteMany({ where: { createdByUserId: userId } });
  await prisma.bizrethinkMcaTemplate.deleteMany({ where: { createdByUserId: userId } });
  await prisma.bizrethinkFeatureAccess.deleteMany({
    where: { scope: 'user', scopeId: String(userId), feature: { in: ['mca-builder', 'mca-clause-draft-rendering'] } },
  });
};

test('a saved provider template opens a stateless transaction interview and downloads an unsigned review PDF', async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000);
  const own = await seedUser();
  const team = own.organisation.teams[0];
  try {
    await grant(own.user.id, 'mca-builder', true);
    await grant(own.user.id, 'mca-clause-draft-rendering', true);
    await apiSignin({ page, email: own.user.email });
    expect((await post(page.request, 'create', { teamId: team.id, data: providerFixture() })).ok()).toBe(true);
    const saved = await prisma.bizrethinkMcaTemplate.findFirstOrThrow({
      where: { createdByUserId: own.user.id },
      include: { revisions: true },
    });
    await page.goto(`${NEXT_PUBLIC_WEBAPP_URL()}/t/${team.url}/mca?template=${saved.id}`);
    await page.getByRole('link', { name: 'Use this template', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Prepare an MCA transaction draft', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Preview filled draft', exact: true }).click();
    await page.getByText('Missing inputs', { exact: true }).click();
    await page.getByRole('button', { name: 'package: Transaction reference', exact: true }).click();
    await expect(page.getByLabel('Transaction reference', { exact: true })).toBeFocused();
    await page.getByLabel('Transaction reference', { exact: true }).fill('SYNTHETIC-BROWSER-DRAFT');
    await page.locator('input[id="draft-input-values.merchant.legalName"]').fill('Example Merchant Inc.');
    await page.locator('input[id="draft-input-values.merchant.documentTaxIdentifier"]').fill('12-3456789');
    await page.locator('input[id="draft-input-values.account.documentIdentifier"]').fill('****4321');
    await page.locator('input[id="draft-input-values.funding.purchasePrice"]').fill('10000.00');
    await page.locator('input[id="draft-input-values.funding.purchasedAmount"]').fill('14000.00');
    for (const [role, name] of [
      ['Merchant representative', 'Merchant Signer'],
      ['Receivables buyer representative', 'Buyer Signer'],
    ]) {
      const group = page.getByRole('group', { name: role, exact: true });
      await group.getByLabel('Printed signer name', { exact: true }).fill(name);
      await group.getByLabel('Signing capacity', { exact: true }).fill('President');
      await group.getByLabel('Signer email', { exact: true }).fill('signer@example.invalid');
    }
    await page.getByRole('button', { name: 'Add guarantor', exact: true }).click();
    const first = page.getByRole('group', { name: 'Guarantor 1', exact: true });
    await first.getByLabel('Guarantor legal name', { exact: true }).fill('First Draft Guarantor');
    await page.getByRole('button', { name: 'Add guarantor', exact: true }).click();
    const second = page.getByRole('group', { name: 'Guarantor 2', exact: true });
    await second.getByLabel('Guarantor type', { exact: true }).selectOption('entity');
    await second.getByLabel('Guarantor legal name', { exact: true }).fill('Separate Guarantor LLC');
    await second.getByLabel('Entity guarantor representative', { exact: true }).fill('Entity Officer');
    await second.getByLabel('Entity guarantor signing capacity', { exact: true }).fill('Manager');
    await page.getByRole('button', { name: 'Preview filled draft', exact: true }).click();
    const preview = page.locator('[data-mca-filled-preview]');
    await expect(preview).toContainText('Internal transaction draft');
    await preview.getByLabel('Package document', { exact: true }).selectOption('frpa');
    await expect(
      preview.getByRole('heading', { name: 'Section 1: Merchant and Funding Information', exact: true }),
    ).toBeVisible();
    await expect(
      preview.locator('[data-mca-section="funding-terms"] [data-mca-template-item="frpa.holdback-explainer"]'),
    ).toBeVisible();
    await expect(preview).toContainText('Example Merchant Inc.');
    await expect(preview).toContainText('Guarantor: Separate Guarantor LLC — Entity Officer (Manager)');
    await expect(preview).toContainText('First Draft Guarantor');
    await preview.getByText('Internal transaction draft', { exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath('transaction-package.png'), fullPage: false });
    const downloadButton = page.getByRole('button', { name: 'Download internal draft PDF', exact: true });
    await expect(downloadButton).toBeEnabled();
    await page.getByLabel('Transaction reference', { exact: true }).fill('SYNTHETIC-REVISED-DRAFT');
    await expect(downloadButton).toBeDisabled();
    await page.getByRole('button', { name: 'Preview filled draft', exact: true }).click();
    await expect(downloadButton).toBeEnabled();
    const responsePromise = page.waitForResponse(
      (response) => response.url().endsWith('/api/bizrethink/mca-draft') && response.request().method() === 'POST',
    );
    const downloadPromise = page.waitForEvent('download');
    await downloadButton.click();
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    expect(response.headers()['cache-control']).toContain('no-store');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('mca-internal-draft.pdf');
    const file = await download.path();
    expect(file).toBeTruthy();
    expect((await readFile(file!)).subarray(0, 5).toString()).toBe('%PDF-');
    expect(await prisma.bizrethinkMcaTemplateRevision.findUnique({ where: { id: saved.revisions[0].id } })).toEqual(
      saved.revisions[0],
    );
    expect(page.url()).not.toContain('SYNTHETIC');
    await page.reload();
    await expect(page.getByLabel('Transaction reference', { exact: true })).toHaveValue('');
  } finally {
    await cleanup(own.user.id);
  }
});

test('filled preview and direct PDF export enforce the same live access, revision and input restrictions', async ({
  page,
}) => {
  const own = await seedUser();
  const foreign = await seedUser();
  const teamId = own.organisation.teams[0].id;
  try {
    await grant(own.user.id, 'mca-builder', true);
    await apiSignin({ page, email: own.user.email });
    const profile = providerFixture();
    expect((await post(page.request, 'create', { teamId, data: profile })).ok()).toBe(true);
    const row = await prisma.bizrethinkMcaTemplate.findFirstOrThrow({ where: { createdByUserId: own.user.id } });
    const input = { teamId, id: row.id, version: 1, draft: emptyMcaDraftInput() };
    for (const send of [
      (value: unknown) => post(page.request, 'fill', value),
      (value: unknown) => pdf(page.request, value),
    ]) {
      expect((await send(input)).status()).toBe(403);
      expect((await send({ ...input, teamId: foreign.organisation.teams[0].id })).status()).toBe(404);
    }
    await grant(own.user.id, 'mca-clause-draft-rendering', true);
    expect((await post(page.request, 'fill', input)).ok()).toBe(true);
    for (const send of [
      (value: unknown) => post(page.request, 'fill', value),
      (value: unknown) => pdf(page.request, value),
    ]) {
      expect(
        (
          await send({ ...input, draft: { ...input.draft, values: { 'provider.legalName': 'Forged Buyer' } } })
        ).status(),
      ).toBe(400);
      expect((await send({ ...input, draft: { ...input.draft, signature: 'Forged signature' } })).status()).toBe(400);
      expect(
        (
          await send({
            ...input,
            draft: { ...input.draft, values: { 'merchant.documentTaxIdentifier': '123-45-6789' } },
          })
        ).status(),
      ).toBe(400);
    }
    expect(
      (
        await post(page.request, 'update', {
          teamId,
          id: row.id,
          data: { expectedVersion: 1, profile: { ...profile, label: 'New current revision' } },
        })
      ).ok(),
    ).toBe(true);
    expect((await post(page.request, 'fill', input)).status()).toBe(400);
    expect((await pdf(page.request, input)).status()).toBe(400);
    await grant(own.user.id, 'mca-clause-draft-rendering', false);
    expect((await pdf(page.request, { ...input, version: 2 })).status()).toBe(403);
    await grant(own.user.id, 'mca-builder', false);
    expect((await post(page.request, 'fill', { ...input, version: 2 })).status()).toBe(404);
    expect((await pdf(page.request, { ...input, version: 2 })).status()).toBe(404);
    await grant(own.user.id, 'mca-builder', true);
    await grant(own.user.id, 'mca-clause-draft-rendering', true);
    await prisma.user.update({ where: { id: own.user.id }, data: { disabled: true } });
    const disabledPreview = await post(page.request, 'fill', { ...input, version: 2 });
    expect(disabledPreview.status()).toBe(401);
    expect(await disabledPreview.text()).toContain('UNAUTHORIZED');
    const disabledPdf = await pdf(page.request, { ...input, version: 2 });
    expect(disabledPdf.status()).toBe(401);
    expect(await disabledPdf.json()).toEqual({ message: 'Sign in to prepare a draft.' });
    expect(disabledPdf.headers()['content-type']).not.toContain('application/pdf');
  } finally {
    await prisma.user.update({ where: { id: own.user.id }, data: { disabled: false } });
    await cleanup(own.user.id);
  }
});

/**
 * ADR 0022: a deal survives a reload, and what survives is the answers.
 *
 * The interview lost everything on reload, which made the builder unusable for
 * work that takes more than one sitting. This exercises the round trip through
 * a real browser and a real database: fill, save, reload to an empty form,
 * reopen, and confirm the answers came back and the row holds no document.
 */
test('a deal is saved, reopened after a reload, and deleted', async ({ page }) => {
  test.setTimeout(60_000);
  const own = await seedUser();
  const team = own.organisation.teams[0];
  try {
    await grant(own.user.id, 'mca-builder', true);
    await grant(own.user.id, 'mca-clause-draft-rendering', true);
    await apiSignin({ page, email: own.user.email });
    expect((await post(page.request, 'create', { teamId: team.id, data: providerFixture() })).ok()).toBe(true);
    const saved = await prisma.bizrethinkMcaTemplate.findFirstOrThrow({ where: { createdByUserId: own.user.id } });
    await page.goto(`${NEXT_PUBLIC_WEBAPP_URL()}/t/${team.url}/mca_/draft?template=${saved.id}&revision=1`);

    await page.getByLabel('Transaction reference', { exact: true }).fill('SAVED-DEAL-001');
    await page.locator('input[id="draft-input-values.merchant.legalName"]').fill('Persisted Merchant Inc.');
    await page.getByRole('button', { name: 'Save this deal', exact: true }).click();
    await expect(page.locator('[data-mca-saved-deals]').getByText('Persisted Merchant Inc.')).toBeVisible();

    // The row holds answers, not an assembled document.
    const row = await prisma.bizrethinkMcaDeal.findFirstOrThrow({ where: { createdByUserId: own.user.id } });
    expect(JSON.stringify(row.input)).toContain('Persisted Merchant Inc.');
    expect(JSON.stringify(row.input)).not.toContain('Pursuant to');
    expect(row.templateRevision).toBe(1);

    // A reload empties the form; reopening brings the answers back.
    await page.reload();
    await expect(page.getByLabel('Transaction reference', { exact: true })).toHaveValue('');
    await page.locator('[data-mca-saved-deals]').getByRole('button', { name: 'Open', exact: true }).click();
    await expect(page.getByLabel('Transaction reference', { exact: true })).toHaveValue('SAVED-DEAL-001');
    await expect(page.locator('input[id="draft-input-values.merchant.legalName"]')).toHaveValue(
      'Persisted Merchant Inc.',
    );

    // Deleting removes the row rather than flagging it.
    await page.locator('[data-mca-saved-deals]').getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.locator('[data-mca-saved-deals]').getByText('No saved deals yet.')).toBeVisible();
    expect(await prisma.bizrethinkMcaDeal.count({ where: { createdByUserId: own.user.id } })).toBe(0);
  } finally {
    await cleanup(own.user.id);
  }
});
