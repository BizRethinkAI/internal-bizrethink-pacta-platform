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
  await prisma.bizrethinkMcaPackageReview.deleteMany({ where: { createdByUserId: userId } });
  await prisma.bizrethinkMcaTemplate.deleteMany({ where: { createdByUserId: userId } });
  await prisma.bizrethinkFeatureAccess.deleteMany({
    where: { scope: 'user', scopeId: String(userId), feature: { in: ['mca-builder', 'mca-clause-draft-rendering'] } },
  });
};

test('counsel reviews a pinned provider revision, raises holistic findings and completes explicit coverage', async ({
  page,
  browser,
}, testInfo) => {
  const { user, organisation } = await seedUser();
  const team = organisation.teams[0];
  const peer = await seedUser({ isAdmin: true });
  const peerTeam = peer.organisation.teams[0];
  const counselContext = await browser.newContext();
  const peerContext = await browser.newContext();
  const profile = providerFixture();
  const reviewEndpoint = (route: string) => `${NEXT_PUBLIC_WEBAPP_URL()}/api/trpc/bizrethink.mcaPackageReview.${route}`;
  try {
    await grant(user.id, 'mca-builder', true);
    await grant(user.id, 'mca-clause-draft-rendering', true);
    await grant(peer.user.id, 'mca-builder', true);
    await grant(peer.user.id, 'mca-clause-draft-rendering', true);
    await apiSignin({ page, email: user.email });
    const created = await post(page.request, 'create', { teamId: team.id, data: profile });
    expect(created.ok()).toBe(true);
    const template = await prisma.bizrethinkMcaTemplate.findFirstOrThrow({ where: { createdByUserId: user.id } });
    const scope = { teamId: team.id, id: template.id, version: 1 };
    await page.goto(`${NEXT_PUBLIC_WEBAPP_URL()}/t/${team.url}/mca?template=${template.id}&revision=1`);
    await page.locator('summary').filter({ hasText: 'Counsel review of this revision' }).click();
    await page.getByLabel('Provider reviewer name', { exact: true }).fill('Synthetic provider counsel');
    await page.getByLabel('Provider reviewer email', { exact: true }).fill('provider-counsel@example.invalid');
    await page.getByLabel('Provider review contact', { exact: true }).fill('Provider legal operations');
    await page
      .getByLabel('Controlled processor form text', { exact: true })
      .fill('Synthetic controlled processor terms. Settlement requires separately confirmed processor acceptance.');
    await page.getByRole('button', { name: 'Create provider review link', exact: true }).click();
    const card = page.locator('[data-mca-provider-review]').filter({ hasText: 'Synthetic provider counsel' });
    await expect(card.getByRole('link', { name: 'Open provider review', exact: true })).toBeVisible();
    const review = await prisma.bizrethinkMcaPackageReview.findFirstOrThrow({
      where: { templateId: template.id, templateVersion: 1 },
    });
    expect(review.kind).toBe('provider');
    expect((review.snapshot as { kind: string }).kind).toBe(review.kind);
    const counsel = await counselContext.newPage();
    await counsel.goto(`${NEXT_PUBLIC_WEBAPP_URL()}/mca-clause-review/${review.token}`);
    await expect(counsel.locator('[data-mca-counsel-package]')).toContainText('Example Receipts Inc.');
    await expect(counsel.locator('[data-mca-counsel-package]')).not.toContainText('Payzli');
    await expect(counsel.getByRole('complementary', { name: 'Review index' }).locator('..')).toHaveCSS(
      'grid-template-columns',
      /^250px /,
    );
    const processorOption = counsel
      .getByLabel('Review document', { exact: true })
      .locator('option')
      .filter({ hasText: 'Example Processor Inc' });
    await counsel
      .getByLabel('Review document', { exact: true })
      .selectOption((await processorOption.getAttribute('value'))!);
    await expect(counsel.locator('[data-mca-processor-review]')).toContainText('Synthetic controlled processor terms.');

    await counsel.getByRole('button', { name: 'Progress & findings', exact: true }).click();
    await counsel.locator('summary').filter({ hasText: 'Record a holistic finding' }).click();
    await counsel.getByLabel('Whole package', { exact: true }).check();
    await counsel.getByLabel('Future Receivables Purchase Agreement', { exact: true }).check();
    await counsel
      .getByLabel('Holistic finding', { exact: true })
      .fill('Synthetic conflict between processor settlement and FRPA collection terms.');
    await counsel.getByRole('button', { name: 'Review brief', exact: true }).click();
    await counsel.getByRole('button', { name: 'Progress & findings', exact: true }).click();
    await expect(counsel.getByLabel('Holistic finding', { exact: true })).toHaveValue(
      'Synthetic conflict between processor settlement and FRPA collection terms.',
    );
    await counsel.getByRole('button', { name: 'Record holistic finding', exact: true }).click();
    await expect(counsel.getByRole('region', { name: 'Holistic review' })).toContainText('1 unanswered findings');
    const finding = await prisma.bizrethinkMcaPackageFinding.findFirstOrThrow({ where: { reviewId: review.id } });
    expect(finding.targetIds).toEqual(['package', 'document:frpa']);
    const forged = await counsel.request.post(reviewEndpoint('recordFinding'), {
      data: dataTransformer.serialize({
        token: review.token,
        targetIds: ['document:equipment-lease'],
        body: 'Outside this selected package.',
      }),
    });
    expect(forged.ok()).toBe(false);
    const premature = await counsel.request.post(reviewEndpoint('complete'), {
      data: dataTransformer.serialize({ token: review.token }),
    });
    expect(premature.ok()).toBe(false);

    const peerPage = await peerContext.newPage();
    await apiSignin({ page: peerPage, email: peer.user.email });
    const peerScope = { teamId: peerTeam.id, id: template.id, version: 1 };
    const foreignInspect = await peerPage.request.get(reviewEndpoint('inspectProvider'), {
      params: { input: JSON.stringify(dataTransformer.serialize({ ...peerScope, reviewId: review.id })) },
    });
    expect(foreignInspect.ok()).toBe(false);
    const foreignAnswer = await peerPage.request.post(reviewEndpoint('answerProvider'), {
      data: dataTransformer.serialize({ ...peerScope, findingId: finding.id, answer: 'Unauthorized' }),
    });
    expect(foreignAnswer.ok()).toBe(false);
    const globalList = await peerPage.request.get(reviewEndpoint('list'));
    expect(globalList.ok()).toBe(true);
    expect(await globalList.text()).not.toContain(review.id);
    const globalInspect = await peerPage.request.get(reviewEndpoint('inspect'), {
      params: { input: JSON.stringify(dataTransformer.serialize({ reviewId: review.id })) },
    });
    expect(globalInspect.ok()).toBe(false);

    await page.reload();
    await page.locator('summary').filter({ hasText: 'Counsel review of this revision' }).click();
    await card.locator('summary').filter({ hasText: 'Unanswered' }).click();
    await card
      .getByLabel('Provider finding response', { exact: true })
      .fill(
        'Synthetic response: retain the recorded concern for this revision; processor acceptance remains separate.',
      );
    await card.getByRole('button', { name: 'Record provider response', exact: true }).click();
    await expect(card).toContainText('0 unanswered findings');
    await counsel.reload();
    await counsel.getByRole('button', { name: 'Progress & findings', exact: true }).click();
    await counsel.locator('summary').filter({ hasText: 'Review checklist' }).click();
    const checklist = counsel.getByRole('checkbox', { name: /^Reviewed:/ });
    for (let index = 0; index < (await checklist.count()); index++) {
      await checklist.nth(index).check();
      await expect(checklist.nth(index)).toBeChecked();
    }
    await expect(counsel.getByRole('button', { name: 'Complete review of saved copy', exact: true })).toBeEnabled();
    await counsel.getByRole('button', { name: 'Complete review of saved copy', exact: true }).click();
    await expect(counsel.getByText(/Review complete for saved copy/)).toBeVisible();
    await counsel.screenshot({ path: testInfo.outputPath('provider-holistic-review-complete.png'), fullPage: false });

    const revised = await post(page.request, 'update', {
      teamId: team.id,
      id: template.id,
      data: {
        expectedVersion: 1,
        profile: { ...profile, buyer: { ...profile.buyer, legalName: 'Revised Example Receipts Inc.' } },
      },
    });
    expect(revised.ok()).toBe(true);
    await counsel.reload();
    await expect(counsel.getByText(/A newer provider revision exists/)).toBeVisible();
    await expect(counsel.locator('[data-mca-counsel-package]')).not.toContainText('Revised Example Receipts Inc.');
    const reopened = await counsel.request.post(reviewEndpoint('recordFinding'), {
      data: dataTransformer.serialize({
        token: review.token,
        targetIds: ['package'],
        body: 'Synthetic follow-up on the saved copy.',
      }),
    });
    expect(reopened.ok()).toBe(true);
    expect(
      (await prisma.bizrethinkMcaPackageReview.findUniqueOrThrow({ where: { id: review.id } })).completedAt,
    ).toBeNull();
    const revoked = await page.request.post(reviewEndpoint('revokeProvider'), {
      data: dataTransformer.serialize({ ...scope, reviewId: review.id }),
    });
    expect(revoked.ok()).toBe(true);
    await counsel.reload();
    await expect(counsel.getByRole('heading', { name: 'Review unavailable' })).toBeVisible();
    await page.reload();
    await page.locator('summary').filter({ hasText: 'Counsel review of this revision' }).click();
    await card.getByRole('button', { name: 'Inspect saved review copy', exact: true }).click();
    await expect(card.locator('[data-mca-counsel-package]')).toContainText('Example Receipts Inc.');
  } finally {
    await counselContext.close();
    await peerContext.close();
    await cleanup(user.id);
    await cleanup(peer.user.id);
  }
});

test('a provider interview saves, reopens and revises a real team template with immutable history', async ({
  page,
}) => {
  const { user, organisation } = await signedInAsAdmin({ page, redirectPath: '/admin/mca-templates' });
  const team = organisation.teams[0];
  const profile = providerFixture();
  profile.buyer.servicingPhone = '+1 555 010 0200';
  try {
    await page.getByRole('button', { name: 'Enable my provider interview access', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Disable my provider interview access', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Enable my internal draft previews', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Disable my internal draft previews', exact: true })).toBeVisible();
    await page.getByRole('link', { name: team.name, exact: true }).click();
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
    await page.getByLabel('Buyer servicing phone', { exact: true }).fill(profile.buyer.servicingPhone);
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
    await preview.getByLabel('Package document', { exact: true }).selectOption('frpa');
    await expect(preview.getByRole('heading', { name: '1. Funding Terms', exact: true })).toBeVisible();
    await expect(preview.getByRole('heading', { name: '3. Purchase', exact: true })).toBeVisible();
    await expect(preview.locator('[data-mca-template-item="frpa.party-identification"]')).toContainText(
      'Example Receipts Inc., a corporation organized under the laws of DE',
    );
    await page.getByRole('button', { name: 'Provider answers', exact: true }).click();
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
    // Existing admin middleware denies non-admin sessions with UNAUTHORIZED.
    expect(badGrant.status()).toBe(401);
    expect(await badGrant.text()).toContain('Not authorized to perform this action');
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
