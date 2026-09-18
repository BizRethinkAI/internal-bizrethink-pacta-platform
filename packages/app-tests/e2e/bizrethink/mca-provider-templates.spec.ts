import { randomUUID } from 'node:crypto';

import { entityFixture } from '@bizrethink/customizations/mca/entities/entity.fixture';
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
/** A template needs an entity to be created against (ADR 0026). */
const seedEntity = async (request: APIRequestContext, teamId: number, userId: number) => {
  const created = await request.post(`${NEXT_PUBLIC_WEBAPP_URL()}/api/trpc/bizrethink.mcaEntities.create`, {
    data: dataTransformer.serialize({ teamId, entity: entityFixture() }),
  });

  expect(created.ok()).toBe(true);

  return (await prisma.bizrethinkMcaEntity.findFirstOrThrow({ where: { createdByUserId: userId } })).id;
};

const cleanupEntities = async (userId: number) => {
  await prisma.bizrethinkMcaEntity.deleteMany({ where: { createdByUserId: userId } });
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
  const reviewEndpoint = (route: string) => `${NEXT_PUBLIC_WEBAPP_URL()}/api/trpc/bizrethink.mcaPackageReview.${route}`;
  try {
    await grant(user.id, 'mca-builder', true);
    await grant(user.id, 'mca-clause-draft-rendering', true);
    await grant(peer.user.id, 'mca-builder', true);
    await grant(peer.user.id, 'mca-clause-draft-rendering', true);
    await apiSignin({ page, email: user.email });
    const entityId = await seedEntity(page.request, team.id, user.id);
    const created = await post(page.request, 'create', { teamId: team.id, entityId, instrument: 'frpa' });
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
    await counsel.getByRole('button', { name: 'Start reviewing', exact: true }).click();
    await counsel.getByLabel('Review document', { exact: true }).selectOption('frpa');
    const party = counsel.locator('[data-mca-package-item="frpa.party-identification"]');
    await expect(party.locator('[data-mca-review-text] > .font-serif')).not.toContainText('{{field:');
    await expect(party.locator('[data-mca-review-text] > .font-serif')).toContainText('Example Receipts Inc.');
    await expect(party.locator('[data-review-field]')).not.toHaveCount(0);
    await counsel.getByLabel('Search review index', { exact: true }).fill('Synthetic controlled processor terms');
    const index = counsel.getByRole('complementary', { name: 'Review index' });
    await index.getByRole('navigation', { name: 'Review contents' }).getByRole('button').click();
    await expect(counsel.locator('[data-mca-processor-review]')).toBeFocused();
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

/**
 * ADR 0026: an entity is added once, and a template is one entity's version of
 * one document. So the flow this covers is two pages, not one form — which is
 * the point of the change rather than an accident of it.
 */
test('an entity is added once, then a template is created against it and revised with immutable history', async ({
  page,
}) => {
  const { user, organisation } = await signedInAsAdmin({ page, redirectPath: '/admin/mca-templates' });
  const team = organisation.teams[0];
  const entity = entityFixture();

  try {
    await page.getByRole('button', { name: 'Enable my provider interview access', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Disable my provider interview access', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Enable my internal draft previews', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Disable my internal draft previews', exact: true })).toBeVisible();

    // 1. The entity, answered once.
    await page.goto(`${NEXT_PUBLIC_WEBAPP_URL()}/t/${team.url}/mca-entities`);
    await expect(page.getByRole('heading', { name: 'Entities', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Add an entity', exact: true }).click();

    await page.getByLabel('Name for this entity in Pacta', { exact: true }).fill(entity.label);

    for (const [label, value] of [
      ['Legal name', entity.identity.legalName],
      ['Entity type, for example corporation', entity.identity.entityType],
      ['State of organisation', entity.identity.organizationState],
      ['Principal address', entity.identity.address],
      ['Notice email', entity.identity.noticeEmail],
      ['Notice mailing address', entity.identity.noticeAddress],
      ['Reconciliation email', entity.identity.reconciliationEmail],
      ['Reconciliation mailing address', entity.identity.reconciliationAddress],
    ] as const) {
      await page.getByLabel(label, { exact: true }).fill(value);
    }

    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.getByLabel('I confirm this entity uses these supported terms', { exact: true }).check();
    await page.getByLabel('Guaranty', { exact: true }).selectOption('limited-conduct');
    await page.getByLabel('Renewals', { exact: true }).selectOption('payoff-only');
    await page.getByRole('button', { name: 'Florida', exact: true }).click();
    await page.getByRole('button', { name: 'New York', exact: true }).click();
    await page.getByRole('button', { name: 'Save entity', exact: true }).click();

    const saved = await prisma.bizrethinkMcaEntity.findFirstOrThrow({ where: { createdByUserId: user.id } });

    expect(saved.label).toBe(entity.label);

    // 2. The template, which chooses that entity and one document.
    await page.goto(`${NEXT_PUBLIC_WEBAPP_URL()}/t/${team.url}/mca`);
    await page.getByLabel('Which entity issues it?', { exact: true }).selectOption(saved.id);
    await page.getByLabel('Which document is it?', { exact: true }).selectOption('frpa');
    await page.getByRole('button', { name: 'Create template', exact: true }).click();

    await expect(page.getByRole('heading', { name: 'Saved revision 1', exact: true })).toBeVisible();

    const id = new URL(page.url()).searchParams.get('template');

    expect(id).toBeTruthy();

    const first = await prisma.bizrethinkMcaTemplateRevision.findFirstOrThrow({ where: { templateId: id ?? '' } });

    // COPIED, not referenced. ADR 0026 §4.
    expect(first.entity).toMatchObject({ label: entity.label });

    await page.getByRole('button', { name: 'Preview document package', exact: true }).click();

    const preview = page.locator('[data-mca-template-preview]');

    await expect(preview).toContainText('Internal draft — transaction fields remain unfilled');
    await expect(preview.locator('[data-mca-template-item="frpa.party-identification"]')).toContainText(
      'Example Receipts Inc., a corporation organized under the laws of DE',
    );

    /*
      A REVISION TAKES A FRESH COPY OF THE ENTITY, and editing the entity is
      the only way an edit ever reaches a document. The already-published
      revision keeps the terms it froze.
    */
    await page.goto(`${NEXT_PUBLIC_WEBAPP_URL()}/t/${team.url}/mca-entities?entity=${saved.id}`);
    await page.getByLabel('Legal name', { exact: true }).fill('Revised Example Receipts Inc.');
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.getByRole('button', { name: 'Save entity', exact: true }).click();

    await page.goto(`${NEXT_PUBLIC_WEBAPP_URL()}/t/${team.url}/mca?template=${id}`);
    await page.getByRole('button', { name: 'Create a new revision', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Saved revision 2', exact: true })).toBeVisible();

    expect(await prisma.bizrethinkMcaTemplateRevision.count({ where: { templateId: id ?? '' } })).toBe(2);
    // Revision 1 is untouched by the entity edit — that is the whole guarantee.
    expect(await prisma.bizrethinkMcaTemplateRevision.findUnique({ where: { id: first.id } })).toEqual(first);
  } finally {
    await cleanupEntities(user.id);
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
  try {
    await grant(own.user.id, 'mca-builder', true);
    await apiSignin({ page, email: own.user.email });
    /*
      ADR 0019 AT THE EDGE. A split funding letter is the processor's, used
      exactly as supplied, and the builder produces none — so the route's own
      input schema turns it away before anything reaches the compiler. Asserted
      over HTTP because the schema is the guard, and only this exercises it.
    */
    const processorForm = await post(page.request, 'create', {
      teamId,
      entityId,
      instrument: 'split-funding',
    });
    expect(processorForm.ok()).toBe(false);
    expect(await prisma.bizrethinkMcaTemplate.count({ where: { teamId } })).toBe(0);

    const entityId = await seedEntity(page.request, teamId, own.user.id);
    const created = await post(page.request, 'create', { teamId, entityId, instrument: 'frpa' });
    expect(created.ok()).toBe(true);
    const row = await prisma.bizrethinkMcaTemplate.findFirstOrThrow({ where: { createdByUserId: own.user.id } });
    const input = { teamId, id: row.id, version: 1 };
    const metadata = await get(page.request, 'get', input);
    expect(metadata.ok()).toBe(true);
    expect(await metadata.text()).not.toContain('sourceFingerprint');
    const preview = await get(page.request, 'preview', input);
    expect(preview.status()).toBe(403);
    expect(await preview.text()).toContain('Internal draft preview access is required');
    const foreignResult = await post(page.request, 'create', {
      teamId: foreignTeamId,
      entityId,
      instrument: 'frpa',
    });
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
      data: { expectedVersion: 1 },
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
