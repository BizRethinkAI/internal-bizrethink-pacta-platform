import { createHash } from 'node:crypto';

import { createDocumentFromTemplate } from '@documenso/lib/server-only/template/create-document-from-template';
import type { DocumentData } from '@prisma/client';
import {
  DocumentDataType,
  DocumentStatus,
  DocumentVisibility,
  EnvelopeType,
  TeamMemberRole,
  TemplateType,
} from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { withApiTokenTeamScope } from '../server-only/api-token-team-scope';
import { envelopeFixture, matchesQuery } from './api-token-team-fixture';

const { db, getTeam, readFile, putFile, webhook } = vi.hoisted(() => ({
  db: {
    envelope: { findFirst: vi.fn(), create: vi.fn() },
    documentData: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    bizrethinkPdfUpload: { findUnique: vi.fn(), create: vi.fn() },
    documentMeta: { create: vi.fn() },
    field: { createMany: vi.fn() },
    documentAuditLog: { create: vi.fn() },
    envelopeAttachment: { findMany: vi.fn(), createMany: vi.fn() },
    $transaction: vi.fn(),
  },
  getTeam: vi.fn(),
  readFile: vi.fn(),
  putFile: vi.fn(),
  webhook: vi.fn(),
}));
vi.mock('@documenso/prisma', () => ({ prisma: db }));
vi.mock('@documenso/lib/server-only/team/get-team', () => ({ getTeamById: getTeam }));
vi.mock('@documenso/lib/server-only/team/get-team-settings', () => ({
  getTeamSettings: async () => ({ documentVisibility: 'EVERYONE', documentLanguage: 'en' }),
}));
vi.mock('@documenso/lib/universal/upload/get-file.server', () => ({ getFileServerSide: readFile }));
vi.mock('@documenso/lib/universal/upload/put-file.server', () => ({ putNormalizedPdfFileServerSide: putFile }));
vi.mock('@documenso/lib/server-only/envelope/increment-id', () => ({
  incrementDocumentId: async () => ({ formattedDocumentId: 'document_100' }),
}));
vi.mock('@documenso/lib/server-only/rate-limit/assert-organisation-rates-and-limits', () => ({
  assertOrganisationRatesAndLimits: vi.fn(),
}));
vi.mock('@documenso/lib/server-only/webhooks/trigger/trigger-webhook', () => ({ triggerWebhook: webhook }));

const makeEnvelope = (id: string, teamId: number, userId = 7) => ({
  ...envelopeFixture({ id, teamId, userId, status: DocumentStatus.PENDING }),
  signatureLevel: 'SES',
  useLegacyFieldInsertion: false,
  team: { id: teamId, url: `team-${teamId}`, organisationId: `org_${teamId}` },
});
type Source = DocumentData & { envelopeItem: { envelopeId: string; envelope: ReturnType<typeof makeEnvelope> } | null };
const data = (id: string, envelope: Source['envelopeItem'] = null): Source => ({
  id,
  type: DocumentDataType.BYTES_64,
  data: `synthetic-${id}`,
  initialData: `synthetic-${id}`,
  envelopeItem: envelope,
});
let sources: Source[];
let template: ReturnType<typeof makeTemplate>;
let role: TeamMemberRole;
let receipt: { documentDataId: string; userId: number; teamId: number | null; fingerprint: string } | null;
const makeTemplate = () => ({
  ...makeEnvelope('template_a', 10),
  type: EnvelopeType.TEMPLATE,
  secondaryId: 'template_1',
  envelopeItems: [
    {
      id: 'item_a',
      envelopeId: 'template_a',
      order: 0,
      title: 'Template',
      documentDataId: 'data_a',
      documentData: data('data_a'),
    },
  ],
});
const fingerprint = (source: DocumentData) =>
  createHash('sha256')
    .update(JSON.stringify([source.type, source.data, source.initialData]))
    .digest('hex');
const use = (customDocumentData: Array<{ documentDataId: string; envelopeItemId?: string }> = []) =>
  createDocumentFromTemplate({
    id: { type: 'templateId', id: 1 },
    userId: 7,
    teamId: 10,
    recipients: [],
    customDocumentData,
    requestMetadata: { source: 'app', auth: null, requestMetadata: {} },
  });
const assertNoCopy = () => {
  expect(readFile).not.toHaveBeenCalled();
  expect(putFile).not.toHaveBeenCalled();
  expect(db.documentData.create).not.toHaveBeenCalled();
  expect(db.envelope.create).not.toHaveBeenCalled();
  expect(db.documentAuditLog.create).not.toHaveBeenCalled();
  expect(webhook).not.toHaveBeenCalled();
};

beforeEach(() => {
  vi.clearAllMocks();
  role = TeamMemberRole.MEMBER;
  receipt = null;
  template = makeTemplate();
  const foreign = makeEnvelope('foreign', 20, 8);
  const local = makeEnvelope('local', 10, 8);
  sources = [
    data('data_a'),
    data('foreign_data', { envelopeId: foreign.id, envelope: foreign }),
    data('local_data', { envelopeId: local.id, envelope: local }),
    data('staged_data'),
  ];
  getTeam.mockImplementation(async () => ({
    id: 10,
    organisationId: 'org_10',
    currentTeamRole: role,
    teamEmail: null,
  }));
  db.envelope.findFirst.mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
    if (where.id === 'created') {
      return { ...makeEnvelope('created', 10), secondaryId: 'document_100' };
    }
    return matchesQuery(template, where) ? template : null;
  });
  const findData = async ({ where }: { where: Record<string, unknown> }) =>
    sources.find((row) => {
      if (where.envelopeItem && !row.envelopeItem) {
        return false;
      }
      return matchesQuery(row, where);
    }) ?? null;
  db.documentData.findFirst.mockImplementation(findData);
  db.documentData.findUnique.mockImplementation(findData);
  db.bizrethinkPdfUpload.findUnique.mockImplementation(async () => receipt);
  readFile.mockImplementation(async (row: DocumentData) => new TextEncoder().encode(row.data));
  putFile.mockResolvedValue(data('normalized_copy'));
  db.documentData.create.mockResolvedValue(data('new_copy'));
  db.documentMeta.create.mockResolvedValue(template.documentMeta);
  db.envelope.create.mockResolvedValue({ ...makeEnvelope('created', 10), secondaryId: 'document_100' });
  db.envelopeAttachment.findMany.mockResolvedValue([]);
  db.$transaction.mockImplementation(async (run: (tx: typeof db) => unknown) => run(db));
});

describe('A-04 actual template-copy helper', () => {
  it.each([
    undefined,
    'item_a',
  ])('refuses a foreign source before reading or copying it (mapping %s)', async (envelopeItemId) => {
    await expect(use([{ documentDataId: 'foreign_data', envelopeItemId }])).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    assertNoCopy();
  });
  it('checks every source before even an allowed earlier item is copied', async () => {
    template.envelopeItems.push({ ...template.envelopeItems[0], id: 'item_second' });
    await expect(use([{ envelopeItemId: 'item_second', documentDataId: 'foreign_data' }])).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    assertNoCopy();
  });
  it('preserves ordinary template use with no replacement', async () => {
    await expect(use()).resolves.toMatchObject({ id: 'created', teamId: 10 });
    expect(readFile).toHaveBeenCalledWith(expect.objectContaining({ id: 'data_a' }));
  });
  it('allows a source the caller may read in the current team', async () => {
    await expect(use([{ documentDataId: 'local_data' }])).resolves.toMatchObject({ id: 'created' });
    expect(readFile).toHaveBeenCalledWith(expect.objectContaining({ id: 'local_data' }));
  });
  it('does not let a member copy an ADMIN-only PDF in the same team', async () => {
    sources[2].envelopeItem!.envelope.visibility = DocumentVisibility.ADMIN;
    await expect(use([{ documentDataId: 'local_data' }])).rejects.toMatchObject({ code: 'NOT_FOUND' });
    assertNoCopy();
  });
  it('allows the ADMIN role to copy that same protected team source', async () => {
    role = TeamMemberRole.ADMIN;
    sources[2].envelopeItem!.envelope.visibility = DocumentVisibility.ADMIN;
    await expect(use([{ documentDataId: 'local_data' }])).resolves.toMatchObject({ id: 'created' });
  });
  it('retains human ownership but prevents an API key inheriting ownership in another team', async () => {
    sources[1].envelopeItem!.envelope.userId = 7;
    await expect(withApiTokenTeamScope(10, () => use([{ documentDataId: 'foreign_data' }]))).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    assertNoCopy();
    await expect(use([{ documentDataId: 'foreign_data' }])).resolves.toMatchObject({ id: 'created' });
  });
  it('allows an organisation-shared template source at the caller role', async () => {
    const source = sources[1].envelopeItem!.envelope;
    source.type = EnvelopeType.TEMPLATE;
    source.templateType = TemplateType.ORGANISATION;
    source.team.organisationId = 'org_10';
    await expect(use([{ documentDataId: 'foreign_data' }])).resolves.toMatchObject({ id: 'created' });
  });
  it('does not accept a deleted source even from the caller team', async () => {
    sources[2].envelopeItem!.envelope.deletedAt = new Date();
    await expect(use([{ documentDataId: 'local_data' }])).rejects.toMatchObject({ code: 'NOT_FOUND' });
    assertNoCopy();
  });
  it('refuses an unattached ID without proven upload ownership', async () => {
    await expect(use([{ documentDataId: 'staged_data' }])).rejects.toMatchObject({ code: 'NOT_FOUND' });
    assertNoCopy();
  });
  it.each([7, 8])('only the actual uploader may reuse an unattached PDF (owner %s)', async (userId) => {
    receipt = { documentDataId: 'staged_data', userId, teamId: null, fingerprint: fingerprint(sources[3]) };
    if (userId === 7) {
      await expect(use([{ documentDataId: 'staged_data' }])).resolves.toMatchObject({ id: 'created' });
    } else {
      await expect(use([{ documentDataId: 'staged_data' }])).rejects.toMatchObject({ code: 'NOT_FOUND' });
      assertNoCopy();
    }
  });
  it.each([null, 20, 10])('an API key requires a staged receipt for its issuing team (receipt %s)', async (teamId) => {
    receipt = { documentDataId: 'staged_data', userId: 7, teamId, fingerprint: fingerprint(sources[3]) };
    const result = withApiTokenTeamScope(10, () => use([{ documentDataId: 'staged_data' }]));
    if (teamId === 10) {
      await expect(result).resolves.toMatchObject({ id: 'created' });
    } else {
      await expect(result).rejects.toMatchObject({ code: 'NOT_FOUND' });
      assertNoCopy();
    }
  });
  it('does not let an old upload receipt authorize data that has changed', async () => {
    receipt = { documentDataId: 'staged_data', userId: 7, teamId: null, fingerprint: fingerprint(sources[3]) };
    sources[3].data = 'different-content';
    await expect(use([{ documentDataId: 'staged_data' }])).rejects.toMatchObject({ code: 'NOT_FOUND' });
    assertNoCopy();
  });
  it('never falls back to an upload receipt when the source is attached elsewhere', async () => {
    receipt = { documentDataId: 'foreign_data', userId: 7, teamId: 10, fingerprint: fingerprint(sources[1]) };
    await expect(use([{ documentDataId: 'foreign_data' }])).rejects.toMatchObject({ code: 'NOT_FOUND' });
    assertNoCopy();
  });
  it('fails closed if the upload ownership lookup fails', async () => {
    db.bizrethinkPdfUpload.findUnique.mockRejectedValue(new Error('Synthetic DB failure'));
    await expect(use([{ documentDataId: 'staged_data' }])).rejects.toBeDefined();
    assertNoCopy();
  });
});
