import { readFileSync } from 'node:fs';
import { sendDocument } from '@documenso/lib/server-only/document/send-document';
import { createEnvelope } from '@documenso/lib/server-only/envelope/create-envelope';
import { extractPlaceholdersFromPDF } from '@documenso/lib/server-only/pdf/auto-place-fields';
import type { ApiRequestMetadata } from '@documenso/lib/universal/extract-request-metadata';
import { putPdfFileServerSide } from '@documenso/lib/universal/upload/put-file.server';
import { prisma } from '@documenso/prisma';
import { DocumentStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PICANA_FACTS, PICANA_MONEY, PICANA_VALUES } from '../matters/picana-ln';
import { SIG_COL } from '../render/lease-document';
import type { LeaseParty } from '../render/signature-blocks';
import type { CreateEnvelopeFromMatterOptions } from '../server-only/create-envelope-from-matter';
import { sendEnvelopeFromMatter } from '../server-only/create-envelope-from-matter';
import { inkIn, tokenTextRegion } from './visible-ink';

/**
 * The 2026-09-14 pilot lease: the landlord pressed Send, the page said "Every
 * signer has been emailed their own link", and the envelope was a DRAFT with
 * every recipient NOT_SENT. `createEnvelope` makes a draft; nothing ever sent
 * it. The same envelope showed raw signing tokens behind every widget.
 *
 * Storage, the database and upstream's envelope calls are mocked. The lease
 * itself is really rendered, because what reaches storage is the point.
 */

vi.mock('@documenso/lib/universal/upload/put-file.server', () => ({ putPdfFileServerSide: vi.fn() }));
vi.mock('@documenso/lib/server-only/envelope/create-envelope', () => ({ createEnvelope: vi.fn() }));
vi.mock('@documenso/lib/server-only/document/send-document', () => ({ sendDocument: vi.fn() }));
vi.mock('../../server-only/feature-access', () => ({
  canAccessLeaseBuilder: vi.fn(async () => true),
  canRenderDraftClauses: vi.fn(async () => true),
  canRenderClause: () => true,
}));
vi.mock('../server-only/clause-approvals', () => ({
  loadClauseApprovals: vi.fn(async () => new Map()),
  statusWithApproval: () => 'published',
}));
vi.mock('@documenso/prisma', () => ({
  prisma: {
    bizrethinkLeaseMatter: { findUnique: vi.fn(async () => ({ propertyId: null })) },
    bizrethinkDocument: { findMany: vi.fn(async () => []) },
    envelope: { deleteMany: vi.fn() },
  },
}));

const PARTIES: LeaseParty[] = [
  { name: 'Landlord One', role: 'landlord' },
  { name: 'Tenant One', role: 'tenant' },
];

const OPTIONS: CreateEnvelopeFromMatterOptions = {
  input: {
    facts: PICANA_FACTS,
    money: PICANA_MONEY,
    values: {
      ...PICANA_VALUES,
      landlordKnowsOfFlooding: 'has no',
      landlordFiledFloodClaim: 'has not',
      landlordReceivedFloodAssistance: 'has not',
    },
    parties: PARTIES,
    propertyAddress: '29090 Picana Lane, Wesley Chapel, Florida 33543',
  },
  matterId: 'lease_matter_test',
  parties: PARTIES,
  emails: { 'Landlord One': 'landlord@example.com', 'Tenant One': 'tenant@example.com' },
  userId: 7,
  teamId: 3,
  organisationId: 'org_test',
  title: 'Test lease',
  requestMetadata: { source: 'app', auth: 'session' } as unknown as ApiRequestMetadata,
};

const uploaded: Uint8Array[] = [];

beforeEach(() => {
  vi.clearAllMocks();
  uploaded.length = 0;

  vi.mocked(putPdfFileServerSide).mockImplementation(async (file) => {
    uploaded.push(new Uint8Array(await (file as File).arrayBuffer()));

    return { documentData: { id: `dd_${uploaded.length}` } } as Awaited<ReturnType<typeof putPdfFileServerSide>>;
  });

  vi.mocked(createEnvelope).mockResolvedValue({ id: 'envelope_test' } as Awaited<ReturnType<typeof createEnvelope>>);
  vi.mocked(sendDocument).mockResolvedValue({} as Awaited<ReturnType<typeof sendDocument>>);
});

describe('sendEnvelopeFromMatter', () => {
  it('uploads PDFs with the signing tokens painted out, and still places every field', async () => {
    await sendEnvelopeFromMatter(OPTIONS);

    expect(uploaded.length).toBeGreaterThan(0);

    const placedFields = vi
      .mocked(createEnvelope)
      .mock.calls[0][0].data.envelopeItems.flatMap((item) => item.placeholders ?? []);

    expect(placedFields.length).toBeGreaterThan(0);

    for (const pdf of uploaded) {
      const regions = (await extractPlaceholdersFromPDF(Buffer.from(pdf))).map((placeholder) =>
        tokenTextRegion(placeholder, SIG_COL),
      );

      expect(await inkIn(pdf, regions)).toEqual(regions.map(() => 0));
    }
  }, 120_000);

  it('sends the envelope it created — a draft reaches nobody', async () => {
    const result = await sendEnvelopeFromMatter(OPTIONS);

    expect(sendDocument).toHaveBeenCalledTimes(1);
    expect(sendDocument).toHaveBeenCalledWith({
      id: { type: 'envelopeId', id: 'envelope_test' },
      userId: 7,
      teamId: 3,
      requestMetadata: OPTIONS.requestMetadata,
    });
    expect(vi.mocked(createEnvelope).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(sendDocument).mock.invocationCallOrder[0],
    );
    expect(result).toEqual({ envelopeId: 'envelope_test', errorAfterSending: null });
    expect(prisma.envelope.deleteMany).not.toHaveBeenCalled();
  }, 120_000);

  it('discards the draft and rethrows when sending is refused before anything went out', async () => {
    const refusal = new Error('The following recipients are missing required fields');

    vi.mocked(sendDocument).mockRejectedValue(refusal);
    vi.mocked(prisma.envelope.deleteMany).mockResolvedValue({ count: 1 });

    await expect(sendEnvelopeFromMatter(OPTIONS)).rejects.toBe(refusal);

    // Only while still a draft: a condition in the delete, not a read before it.
    expect(prisma.envelope.deleteMany).toHaveBeenCalledWith({
      where: { id: 'envelope_test', status: DocumentStatus.DRAFT },
    });
  }, 120_000);

  it('keeps the envelope and reports the failure when it had already gone out', async () => {
    const lateFailure = new Error('webhook trigger failed');

    vi.mocked(sendDocument).mockRejectedValue(lateFailure);
    vi.mocked(prisma.envelope.deleteMany).mockResolvedValue({ count: 0 });

    // Not thrown: the caller must still record the envelope against the
    // matter, or the next click sends every signer a second lease.
    expect(await sendEnvelopeFromMatter(OPTIONS)).toEqual({
      envelopeId: 'envelope_test',
      errorAfterSending: lateFailure,
    });
  }, 120_000);
});

/**
 * The caller. Everything above is worthless if the mutation keeps calling the
 * create-only path — "a mechanism with no caller" is this repo's most expensive
 * habit. Source-level because the router needs a database.
 */
describe('the send mutation', () => {
  const router = readFileSync(new URL('../../server-only/trpc/lease-builder-router.ts', import.meta.url), 'utf8');
  const sendAt = router.indexOf('= await sendEnvelopeFromMatter(');

  it('sends, rather than only creating a draft', () => {
    expect(sendAt).toBeGreaterThan(-1);
    expect(router).not.toMatch(/await createEnvelopeFromMatter\(/);
  });

  it('marks the lease sent only after the send, and reports a failure after recording it', () => {
    const after = router.slice(sendAt);
    const stampAt = after.indexOf("status: 'sent'");
    const reportAt = after.indexOf('if (errorAfterSending)');

    expect(stampAt).toBeGreaterThan(-1);
    expect(reportAt).toBeGreaterThan(stampAt);
    expect(router.slice(0, sendAt)).not.toContain("status: 'sent'");
  });
});
