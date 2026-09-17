import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { providerFixture } from '@bizrethink/customizations/mca/templates/profile.fixture';
import { NEXT_PUBLIC_WEBAPP_URL } from '@documenso/lib/constants/app';
import { prisma } from '@documenso/prisma';
import { seedUser } from '@documenso/prisma/seed/users';
import { dataTransformer } from '@documenso/trpc/utils/data-transformer';
import { type APIRequestContext, expect, test } from '@playwright/test';
import { apiSignin } from '../fixtures/authentication';

/**
 * Previewing a saved template.
 *
 * ADR 0025: the artifact is a TEMPLATE and a deal never enters this vertical.
 * This file used to drive a transaction interview — merchant legal name,
 * guarantors, signers, funding figures — and download an internal draft. There
 * is nothing to fill in now, so what remains is: which document, and does a PDF
 * come back.
 *
 * THE ACCESS, REVISION AND ACCOUNT RESTRICTIONS ARE KEPT IN FULL. They never
 * belonged to the deal path; they belong to anything that renders a funder's own
 * programme terms.
 */
const post = (request: APIRequestContext, route: string, input: unknown) =>
  request.post(`${NEXT_PUBLIC_WEBAPP_URL()}/api/trpc/bizrethink.mcaTemplates.${route}`, {
    data: dataTransformer.serialize(input),
  });

const pdf = (request: APIRequestContext, input: unknown) =>
  request.post(`${NEXT_PUBLIC_WEBAPP_URL()}/api/bizrethink/mca-template-preview`, { data: input });

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

test('a saved provider template previews the document it produces, as a PDF', async ({ page }, testInfo) => {
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
    await page.getByRole('link', { name: 'Preview this template', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Preview this template', exact: true })).toBeVisible();

    // No interview at all: the whole choice is which document to look at.
    await expect(page.getByText('Specimen values, not a transaction')).toBeVisible();

    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/bizrethink/mca-template-preview') && response.request().method() === 'POST',
    );
    const downloadPromise = page.waitForEvent('download');

    await page.getByRole('button', { name: 'Download preview', exact: true }).first().click();

    const response = await responsePromise;

    expect(response.status()).toBe(200);
    expect(response.headers()['cache-control']).toContain('no-store');

    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain('preview');

    const file = await download.path();

    expect(file).toBeTruthy();
    expect((await readFile(file!)).subarray(0, 5).toString()).toBe('%PDF-');

    // Previewing reads a saved revision; it never writes one.
    expect(await prisma.bizrethinkMcaTemplateRevision.findUnique({ where: { id: saved.revisions[0].id } })).toEqual(
      saved.revisions[0],
    );

    await testInfo.attach('mca-template-preview', { path: file!, contentType: 'application/pdf' });
  } finally {
    await cleanup(own.user.id);
  }
});

test('previewing enforces the same live access, revision and account restrictions', async ({ page }) => {
  const own = await seedUser();
  const foreign = await seedUser();
  const teamId = own.organisation.teams[0].id;

  try {
    await grant(own.user.id, 'mca-builder', true);
    await apiSignin({ page, email: own.user.email });

    const profile = providerFixture();

    expect((await post(page.request, 'create', { teamId, data: profile })).ok()).toBe(true);

    const row = await prisma.bizrethinkMcaTemplate.findFirstOrThrow({ where: { createdByUserId: own.user.id } });
    const input = { teamId, id: row.id, version: 1, instrument: 'frpa' };

    // The builder grant alone does not render: putting a funder's programme
    // terms on a page needs the separate draft-rendering grant.
    expect((await pdf(page.request, input)).status()).toBe(403);
    expect((await pdf(page.request, { ...input, teamId: foreign.organisation.teams[0].id })).status()).toBe(404);

    await grant(own.user.id, 'mca-clause-draft-rendering', true);
    expect((await pdf(page.request, input)).ok()).toBe(true);

    // An instrument the builder does not produce is refused before anything is
    // rendered — ADR 0019 keeps the split funding letter the processor's.
    expect((await pdf(page.request, { ...input, instrument: 'split-funding' })).status()).toBe(400);
    expect((await pdf(page.request, { ...input, instrument: 'not-an-instrument' })).status()).toBe(400);

    // A superseded revision is not previewable. A stale render is how a
    // reviewer comes to read words that are no longer current.
    expect(
      (
        await post(page.request, 'update', {
          teamId,
          id: row.id,
          data: { expectedVersion: 1, profile: { ...profile, label: 'New current revision' } },
        })
      ).ok(),
    ).toBe(true);
    expect((await pdf(page.request, input)).status()).toBe(400);

    await grant(own.user.id, 'mca-clause-draft-rendering', false);
    expect((await pdf(page.request, { ...input, version: 2 })).status()).toBe(403);

    await grant(own.user.id, 'mca-builder', false);
    expect((await pdf(page.request, { ...input, version: 2 })).status()).toBe(404);

    await grant(own.user.id, 'mca-builder', true);
    await grant(own.user.id, 'mca-clause-draft-rendering', true);
    await prisma.user.update({ where: { id: own.user.id }, data: { disabled: true } });

    const disabled = await pdf(page.request, { ...input, version: 2 });

    expect(disabled.status()).toBe(401);
    expect(disabled.headers()['content-type']).not.toContain('application/pdf');
  } finally {
    await prisma.user.update({ where: { id: own.user.id }, data: { disabled: false } });
    await cleanup(own.user.id);
  }
});
