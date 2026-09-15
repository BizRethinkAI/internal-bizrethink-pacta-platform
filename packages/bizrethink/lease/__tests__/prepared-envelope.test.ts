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
import { discardPreparedEnvelope, prepareEnvelopeFromMatter } from '../server-only/prepared-envelope';
import { inkIn, tokenTextRegion } from './visible-ink';

/**
 * Prepare, review, send.
 *
 * On 2026-09-14 the pilot lease was marked sent while its envelope sat in DRAFT
 * with raw signing tokens on every signature line. The repository owner chose
 * to check an envelope before it goes out, so the lease builder PREPARES a
 * draft — clean PDFs, fields placed, nobody emailed — and the landlord sends it
 * from the envelope. A draft that is wrong is discarded, and the lease reopens.
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
vi.mock('@documenso/prisma', () => {
  const client = {
    bizrethinkLeaseMatter: { findUnique: vi.fn(), updateMany: vi.fn() },
    bizrethinkDocument: { findMany: vi.fn() },
    envelope: { deleteMany: vi.fn(), findFirst: vi.fn() },
    $transaction: vi.fn(),
  };

  return { prisma: client };
});

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
  vi.mocked(prisma.bizrethinkLeaseMatter.findUnique).mockResolvedValue({ propertyId: null } as never);
  vi.mocked(prisma.bizrethinkDocument.findMany).mockResolvedValue([]);
  vi.mocked(prisma.bizrethinkLeaseMatter.updateMany).mockResolvedValue({ count: 1 });
  vi.mocked(prisma.envelope.deleteMany).mockResolvedValue({ count: 1 });
  vi.mocked(prisma.envelope.findFirst).mockResolvedValue(null);
  vi.mocked(prisma.$transaction).mockImplementation(
    (async (run: (tx: typeof prisma) => unknown) => await run(prisma)) as never,
  );
});

describe('prepareEnvelopeFromMatter', () => {
  it('uploads PDFs with the signing tokens painted out, and still places every field', async () => {
    await prepareEnvelopeFromMatter({ ...OPTIONS, rulePackVersion: 1 });

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

  it('records a draft envelope against the lease and emails nobody', async () => {
    expect(await prepareEnvelopeFromMatter({ ...OPTIONS, rulePackVersion: 4 })).toEqual({
      envelopeId: 'envelope_test',
    });

    expect(sendDocument).not.toHaveBeenCalled();

    // Conditional on the lease still being an unprepared draft, in the write.
    expect(prisma.bizrethinkLeaseMatter.updateMany).toHaveBeenCalledWith({
      where: { id: 'lease_matter_test', status: 'draft', envelopeId: null },
      data: expect.objectContaining({ status: 'ready', envelopeId: 'envelope_test', rulePackVersion: 4 }),
    });
    expect(prisma.envelope.deleteMany).not.toHaveBeenCalled();
  }, 120_000);

  /*
    Two clicks on a slow connection. Both render and create; only one may be
    recorded. The loser's envelope is a draft nobody can reach from the lease,
    so it is removed rather than left in the documents list.
  */
  it('removes its own envelope and refuses when the lease was prepared in the meantime', async () => {
    vi.mocked(prisma.bizrethinkLeaseMatter.updateMany).mockResolvedValue({ count: 0 });

    await expect(prepareEnvelopeFromMatter({ ...OPTIONS, rulePackVersion: 1 })).rejects.toThrow(
      /already has an envelope/,
    );

    expect(prisma.envelope.deleteMany).toHaveBeenCalledWith({
      where: { id: 'envelope_test', status: DocumentStatus.DRAFT },
    });
  }, 120_000);
});

describe('discardPreparedEnvelope', () => {
  const DISCARD = { matterId: 'lease_matter_test', envelopeId: 'envelope_test', teamId: 3 };

  const reopened = {
    where: { id: 'lease_matter_test', envelopeId: 'envelope_test' },
    data: { status: 'draft', envelopeId: null, rulePackVersion: null, generatedAt: null },
  };

  it('deletes a draft nobody has received and reopens the lease', async () => {
    await discardPreparedEnvelope(DISCARD);

    // The status is a condition of the delete itself: a send that lands
    // between a read and a delete cannot be erased.
    expect(prisma.envelope.deleteMany).toHaveBeenCalledWith({
      where: { id: 'envelope_test', teamId: 3, status: DocumentStatus.DRAFT },
    });
    expect(prisma.bizrethinkLeaseMatter.updateMany).toHaveBeenCalledWith(reopened);
  });

  it('reopens the lease when the envelope was already deleted from the documents list', async () => {
    vi.mocked(prisma.envelope.deleteMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.envelope.findFirst).mockResolvedValue(null);

    await discardPreparedEnvelope(DISCARD);

    expect(prisma.bizrethinkLeaseMatter.updateMany).toHaveBeenCalledWith(reopened);
  });

  it('refuses, and leaves the lease alone, once the envelope has gone out', async () => {
    vi.mocked(prisma.envelope.deleteMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.envelope.findFirst).mockResolvedValue({ status: DocumentStatus.PENDING } as never);

    await expect(discardPreparedEnvelope(DISCARD)).rejects.toThrow(/already been sent/);

    expect(prisma.bizrethinkLeaseMatter.updateMany).not.toHaveBeenCalled();
  });

  it('fails the whole discard when the lease no longer points at that envelope', async () => {
    vi.mocked(prisma.bizrethinkLeaseMatter.updateMany).mockResolvedValue({ count: 0 });

    await expect(discardPreparedEnvelope(DISCARD)).rejects.toThrow(/changed/);

    // Thrown inside the transaction, so the delete above it rolls back.
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});

/**
 * The callers. A mechanism with no caller is this repo's most expensive habit,
 * and "prepare" is only true while nothing on this path can email a signer.
 * Source-level because the router and the route need a database.
 */
describe('the lease builder never sends on its own', () => {
  const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

  const router = read('../../server-only/trpc/lease-builder-router.ts');
  const route = read('../../../../apps/remix/app/routes/_authenticated+/t.$teamUrl+/leases.$id.tsx');

  it('has no path to sendDocument', () => {
    for (const source of [
      router,
      read('../server-only/create-envelope-from-matter.ts'),
      read('../server-only/prepared-envelope.ts'),
    ]) {
      expect(source).not.toMatch(/send-document|sendDocument\(/);
    }
  });

  it('prepares and discards through the tested functions', () => {
    expect(router).toContain('await prepareEnvelopeFromMatter(');
    expect(router).toContain('await discardPreparedEnvelope(');
    expect(router).not.toMatch(/await createEnvelopeFromMatter\(/);
    expect(route).toContain('matter.prepare.useMutation');
    expect(route).toContain('matter.discardEnvelope.useMutation');
  });

  /*
    "Every signer has been emailed" was shown over a draft. The page now takes
    the envelope's status from the loader, and only the PENDING branch may say
    anyone was sent anything.
  */
  /*
    "After Prepare the envelope, I don't see a send option." A draft's summary
    page offers only Edit; Send Document lives in the editor. The link goes
    straight there, and says what the landlord will do on it.
  */
  /*
    REVIEW AND SEND ARE TWO PLACES. #255 pointed one "Review and send" button at
    the editor, which opens on its upload-and-recipients step — and the page the
    owner used to check the envelope, the summary with a tab per document and
    every field drawn on it, was no longer reachable from the lease. Review goes
    to that page; sending goes to the editor, where Send Document is.
  */
  it('reviews on the envelope page and sends from the editor, as two buttons', () => {
    expect(route).toMatch(/href=\{`\/t\/\$\{teamUrl\}\/documents\/\$\{envelopeId\}`\}[\s\S]{0,80}Review the envelope/);
    expect(route).toMatch(
      /href=\{`\/t\/\$\{teamUrl\}\/documents\/\$\{envelopeId\}\/edit`\}[\s\S]{0,80}Send the envelope/,
    );
    expect(route).not.toContain('Review and send the envelope');
  });

  it('only claims signers were sent the lease when the envelope says so', () => {
    expect(route).toContain('envelopeStatus');
    expect(route).not.toContain('Every signer has been emailed');
  });
});
