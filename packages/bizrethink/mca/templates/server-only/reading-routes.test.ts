import { logger } from '@documenso/lib/utils/logger';
import type { TrpcContext } from '@documenso/trpc/server/context';
import { router } from '@documenso/trpc/server/trpc';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ALL_MCA_CONTENT } from '../../catalogue';
import { previewMcaTemplateRoute } from '../../server-only/trpc/templates/preview';
import { allOptionsTemplateFixture } from '../all-options.fixture';
import { compileMcaTemplate } from '../compile';
import { providerFixture } from '../profile.fixture';

const mocks = vi.hoisted(() => ({
  db: { team: { findFirst: vi.fn() }, bizrethinkMcaTemplate: { findFirst: vi.fn() } },
  grant: vi.fn(),
}));
vi.mock('@documenso/prisma', () => ({ prisma: mocks.db }));
vi.mock('../../../server-only/feature-access', () => ({ getFeatureAccess: mocks.grant }));

// Keep the actual authenticated handlers, service, compiler, projection and
// preparation path. Only database/feature lookups use synthetic records.
const api = router({ preview: previewMcaTemplateRoute });
const context = (): TrpcContext => ({
  user: {
    id: 41,
    name: 'Synthetic reviewer',
    email: 'reviewer@example.invalid',
    disabled: false,
    roles: ['USER'],
    emailVerified: new Date('2026-09-13T00:00:00Z'),
    avatarImageId: null,
    signature: null,
    twoFactorEnabled: false,
  },
  session: {
    id: 'synthetic-session',
    sessionToken: 'synthetic-session',
    userId: 41,
    createdAt: new Date('2026-09-13T00:00:00Z'),
    updatedAt: new Date('2026-09-13T00:00:00Z'),
    expiresAt: new Date('2030-01-01T00:00:00Z'),
    ipAddress: null,
    userAgent: null,
  },
  teamId: 17,
  req: new Request('http://test.invalid/api/trpc'),
  res: new Response(),
  logger,
  metadata: { auth: null, source: 'app', requestMetadata: {} },
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.db.team.findFirst.mockResolvedValue({ id: 17, organisationId: 'synthetic-org' });
  mocks.grant.mockResolvedValue(true);
});

/**
 * ADR 0025 retired the deal path, and with it this file's second half — a
 * `fill` route that took a merchant's answers. What it was actually protecting
 * survives untouched: a `[[clause:...]]` reference must come back through the
 * ROUTE as a real number pointing at a real clause, across documents.
 */
describe('referenced clauses through provider preview', () => {
  it.each([
    { label: 'FRPA', fixture: () => compileMcaTemplate(providerFixture()), hasCrossDocumentReferences: false },
    /*
      FALSE SINCE ADR 0026. The ISO PRA was the only document citing another,
      and it now names the FRPA's Right to Cancel provision rather than
      numbering it — which is what lets each document be compiled on its own.

      Kept as a scenario rather than deleted: the reference MACHINERY is
      untouched, and this asserts the library no longer uses it. A clause that
      reintroduced a cross-document citation would flip this back to true and
      fail here.
    */
    { label: 'all offered instruments', fixture: allOptionsTemplateFixture, hasCrossDocumentReferences: false },
  ])('$label retains readable clause and section references through the route', async (scenario) => {
    const template = scenario.fixture();
    const before = JSON.stringify(template);
    mocks.db.bizrethinkMcaTemplate.findFirst.mockResolvedValue({
      id: 'synthetic-template',
      label: template.profile.label,
      currentRevision: 1,
      revisions: [{ version: 1, profile: template.profile, fingerprint: template.fingerprint }],
    });
    const request = { teamId: 17, id: 'synthetic-template', version: 1 };
    const caller = api.createCaller(context());
    const preview = await caller.preview(request);
    const referenceKinds = new Set<string>();
    let referencedClauses = 0;
    let hasCrossDocumentReference = false;

    for (const document of preview.documents) {
      for (const item of document.items) {
        const source = ALL_MCA_CONTENT.find((entry) => entry.slug === item.slug);
        if (source?.kind !== 'clause' || !/\[\[(clause|section):/.test(source.body)) {
          continue;
        }
        referencedClauses++;
        // The corpus has canonical tokens; the compiled snapshot already has
        // numbers before projectTemplateReading adds navigation metadata.
        const compiledItem = template.documents
          .flatMap((entry) => entry.items)
          .find((entry) => entry.slug === item.slug);
        expect(compiledItem?.body, item.slug).not.toMatch(/\[\[|\]\]/);
        expect(item.body, item.slug).toBe(compiledItem?.body);
        expect(item.reading?.segments.map((part) => part.text).join(''), item.slug).toBe(item.body);
        const references = item.reading?.segments.filter((part) => part.kind === 'reference') ?? [];
        expect(references.length, item.slug).toBeGreaterThan(0);
        for (const reference of references) {
          referenceKinds.add(reference.targetKind);
          hasCrossDocumentReference ||= reference.instrument !== document.instrument;
          const target = preview.documents
            .find((entry) => entry.instrument === reference.instrument)
            ?.items.find((entry) => entry.slug === reference.targetSlug);
          expect(target?.number, reference.targetSlug).toMatch(/^\d+\.\d+$/);
          expect(reference.text, item.slug).toBe(
            reference.targetKind === 'clause' ? target?.number : target?.number?.split('.')[0],
          );
        }
      }
    }
    expect(referencedClauses).toBeGreaterThan(0);
    expect([...referenceKinds].sort()).toEqual(['clause', 'section']);
    expect(hasCrossDocumentReference).toBe(scenario.hasCrossDocumentReferences);
    expect(preview.fingerprint).toBe(template.fingerprint);

    expect(JSON.stringify(template)).toBe(before);
  });
});
