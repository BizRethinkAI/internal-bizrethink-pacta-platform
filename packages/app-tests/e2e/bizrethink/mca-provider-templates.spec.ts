import { randomUUID } from 'node:crypto';

import { providerFixture } from '@bizrethink/customizations/mca/templates/profile.fixture';
import { NEXT_PUBLIC_WEBAPP_URL } from '@documenso/lib/constants/app';
import { prisma } from '@documenso/prisma';
import { seedUser } from '@documenso/prisma/seed/users';
import { dataTransformer } from '@documenso/trpc/utils/data-transformer';
import { type APIRequestContext, expect, test } from '@playwright/test';

import { apiSignin } from '../fixtures/authentication';
import { signedInAsAdmin } from '../fixtures/bizrethink-auth';

const endpoint = (route: string) => `${NEXT_PUBLIC_WEBAPP_URL()}/api/trpc/bizrethink.mcaTemplates.${route}`;
const post = (request: APIRequestContext, route: string, input: unknown) =>
  request.post(endpoint(route), { data: dataTransformer.serialize(input) });
const get = (request: APIRequestContext, route: string, input: unknown) =>
  request.get(endpoint(route), { params: { input: JSON.stringify(dataTransformer.serialize(input)) } });
const grant = async (userId: number, feature: string, enabled: boolean) => {
  const key = { feature, scope: 'user', scopeId: String(userId) };
  await prisma.bizrethinkFeatureAccess.upsert({
    where: { feature_scope_scopeId: key },
    create: { id: randomUUID(), ...key, enabled },
    update: { enabled },
  });
};
const cleanup = async (userId: number) => {
  await prisma.bizrethinkMcaTemplate.deleteMany({ where: { createdByUserId: userId } });
  await prisma.bizrethinkFeatureAccess.deleteMany({
    where: { scope: 'user', scopeId: String(userId), feature: { in: ['mca-builder', 'mca-clause-draft-rendering'] } },
  });
};

test('a provider interview saves, reopens and revises a real team template with immutable history', async ({
  page,
}) => {
  const { user, organisation } = await signedInAsAdmin({ page, redirectPath: '/admin/mca-templates' });
  const team = organisation.teams[0];
  const profile = providerFixture();
  try {
    await page.getByRole('button', { name: 'Enable my provider interview access', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Disable my provider interview access', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Enable my internal draft previews', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Disable my internal draft previews', exact: true })).toBeVisible();
    await page.locator(`a[href="/t/${team.url}/mca"]`).click();
    await expect(page.getByRole('heading', { name: 'MCA provider templates', exact: true })).toBeVisible();
    await page.getByLabel('Template name', { exact: true }).fill(profile.label);
    for (const [label, value] of [
      ['Legal name', profile.buyer.legalName],
      ['Entity type', profile.buyer.entityType],
      ['Formation jurisdiction', profile.buyer.organizationState],
      ['Principal address', profile.buyer.address],
      ['Notice mailing address', profile.buyer.noticeAddress],
      ['Notice email', profile.buyer.noticeEmail],
      ['Reconciliation email', profile.buyer.reconciliationEmail],
      ['Reconciliation mailing address', profile.buyer.reconciliationAddress],
    ]) {
      await page.getByLabel(label, { exact: true }).fill(value);
    }
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByLabel('I confirm this provider uses these supported terms', { exact: true }).check();
    await page.getByLabel('FRPA guaranty', { exact: true }).selectOption('limited-conduct');
    await page.getByLabel('Renewal treatment', { exact: true }).selectOption('payoff-only');
    await page.getByLabel('California', { exact: true }).check();
    await page.getByLabel('Florida', { exact: true }).check();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    for (const [label, value] of [
      ['Processor legal name', profile.processor.legalName],
      ['Required processor form title', profile.processor.requiredForm.title],
      ['Processor form version', profile.processor.requiredForm.version],
      ['Form reference or controlled document location', profile.processor.requiredForm.reference],
    ]) {
      await page.getByLabel(label, { exact: true }).fill(value);
    }
    await page.getByRole('button', { name: 'Save template revision', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Saved revision 1', exact: true })).toBeVisible();
    const id = new URL(page.url()).searchParams.get('template');
    expect(id).toBeTruthy();
    const first = await prisma.bizrethinkMcaTemplateRevision.findFirstOrThrow({ where: { templateId: id ?? '' } });
    expect(first.profile).toEqual(profile);
    await page.reload();
    await expect(page.getByLabel('Legal name', { exact: true })).toHaveValue(profile.buyer.legalName);
    await page.getByRole('button', { name: 'Preview document package', exact: true }).click();
    const preview = page.locator('[data-mca-template-preview]');
    await expect(preview).toContainText('Internal draft — transaction fields remain unfilled');
    await preview.getByText('Future Receivables Purchase Agreement', { exact: true }).click();
    await expect(preview.locator('[data-mca-template-item="frpa.party-identification"]')).toContainText(
      'Example Receipts Inc., a corporation organized under the laws of DE',
    );
    await page.getByLabel('Template name', { exact: true }).fill('Revised synthetic programme');
    await page.getByRole('button', { name: '3. Operations', exact: true }).click();
    await page.getByRole('button', { name: 'Save template revision', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Saved revision 2', exact: true })).toBeVisible();
    expect(await prisma.bizrethinkMcaTemplateRevision.count({ where: { templateId: id ?? '' } })).toBe(2);
    expect(await prisma.bizrethinkMcaTemplateRevision.findUnique({ where: { id: first.id } })).toEqual(first);
    await page.getByLabel('Revision history', { exact: true }).selectOption('1');
    await expect(page.getByLabel('Template name', { exact: true })).toHaveValue(profile.label);
    await expect(page.getByLabel('Template name', { exact: true })).toBeDisabled();
  } finally {
    await cleanup(user.id);
  }
});

test('HTTP access separates membership, write authority and draft permission; stale editors cannot overwrite a revision', async ({
  page,
}) => {
  const own = await seedUser();
  const foreign = await seedUser();
  const teamId = own.organisation.teams[0].id;
  const foreignTeamId = foreign.organisation.teams[0].id;
  const profile = providerFixture();
  try {
    await grant(own.user.id, 'mca-builder', true);
    await apiSignin({ page, email: own.user.email });
    const created = await post(page.request, 'create', { teamId, data: profile });
    expect(created.ok()).toBe(true);
    const row = await prisma.bizrethinkMcaTemplate.findFirstOrThrow({ where: { createdByUserId: own.user.id } });
    const input = { teamId, id: row.id, version: 1 };
    const metadata = await get(page.request, 'get', input);
    expect(metadata.ok()).toBe(true);
    expect(await metadata.text()).not.toContain('sourceFingerprint');
    const preview = await get(page.request, 'preview', input);
    expect(preview.status()).toBe(403);
    expect(await preview.text()).toContain('Internal draft preview access is required');
    const foreignResult = await post(page.request, 'create', { teamId: foreignTeamId, data: profile });
    expect(foreignResult.status()).toBe(404);
    expect(await prisma.bizrethinkMcaTemplate.count({ where: { teamId: foreignTeamId } })).toBe(0);
    const leaf = await page.request.get(`${NEXT_PUBLIC_WEBAPP_URL()}/admin/mca-templates.data`, {
      params: { _routes: 'routes/_authenticated+/admin+/mca-templates' },
    });
    expect(leaf.status()).toBe(404);
    const badGrant = await post(page.request, 'setAccess', { feature: 'mca-clause-draft-rendering', enabled: true });
    expect(badGrant.status()).toBe(403);
    const update = {
      teamId,
      id: row.id,
      data: { expectedVersion: 1, profile: { ...profile, label: 'Second revision' } },
    };
    expect((await post(page.request, 'update', update)).ok()).toBe(true);
    const stale = await post(page.request, 'update', update);
    expect(stale.ok()).toBe(false);
    expect(await stale.text()).toContain('Reload before saving');
    expect(await prisma.bizrethinkMcaTemplateRevision.count({ where: { templateId: row.id } })).toBe(2);
    await grant(own.user.id, 'mca-clause-draft-rendering', true);
    expect((await get(page.request, 'preview', { ...input, version: 2 })).ok()).toBe(true);
    await grant(own.user.id, 'mca-clause-draft-rendering', false);
    expect((await get(page.request, 'preview', { ...input, version: 2 })).status()).toBe(403);
    await prisma.teamGroup.updateMany({ where: { teamId }, data: { teamRole: 'MEMBER' } });
    expect(
      (await post(page.request, 'update', { ...update, data: { ...update.data, expectedVersion: 2 } })).status(),
    ).toBe(404);
    expect(await prisma.bizrethinkMcaTemplateRevision.count({ where: { templateId: row.id } })).toBe(2);
    await grant(own.user.id, 'mca-builder', false);
    expect((await get(page.request, 'get', input)).status()).toBe(404);
  } finally {
    await cleanup(own.user.id);
  }
});
