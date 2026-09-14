import { sendDocument } from '@documenso/lib/server-only/document/send-document';
import { createEnvelope } from '@documenso/lib/server-only/envelope/create-envelope';
import { duplicateEnvelope } from '@documenso/lib/server-only/envelope/duplicate-envelope';
import { EnvelopeType, RecipientRole } from '@prisma/client';
import { beforeEach, expect, it, vi } from 'vitest';
import { envelopeFixture, recipientFixture } from './recipient-auth-fixture';

const { db, jobs, incrementTemplate } = vi.hoisted(() => ({
  db: {
    user: { findFirst: vi.fn() },
    envelope: { findFirst: vi.fn(), findFirstOrThrow: vi.fn() },
    team: { findUniqueOrThrow: vi.fn(), findFirst: vi.fn() },
    documentMeta: { create: vi.fn() },
    organisation: { findUniqueOrThrow: vi.fn() },
    bizrethinkOrganisationBilling: { findUnique: vi.fn() },
    bizrethinkTrialOrganisation: { findUnique: vi.fn() },
    bizrethinkTrialBudget: { findUnique: vi.fn() },
    bizrethinkInstanceResourcePolicy: { findUnique: vi.fn() },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  },
  jobs: vi.fn(),
  incrementTemplate: vi.fn(),
}));
vi.mock('@documenso/prisma', () => ({ prisma: db }));
vi.mock('@documenso/lib/jobs/client', () => ({ jobs: { triggerJob: jobs }, jobsClient: { triggerJob: jobs } }));
vi.mock('@documenso/lib/server-only/envelope/get-envelope-by-id', () => ({
  getEnvelopeWhereInput: async () => ({
    envelopeWhereInput: { id: 'envelope_team_a' },
    team: { organisationId: 'trial_org' },
  }),
}));
vi.mock('@documenso/lib/server-only/envelope/increment-id', () => ({
  incrementTemplateId: incrementTemplate,
  incrementDocumentId: vi.fn(),
}));
let envelope = envelopeFixture();
const send = () =>
  sendDocument({
    id: { type: 'envelopeId', id: envelope.id },
    userId: 7,
    teamId: 10,
    requestMetadata: { source: 'app', requestMetadata: {}, auth: null },
  });
beforeEach(() => {
  vi.resetAllMocks();
  envelope = {
    ...envelopeFixture(),
    recipients: Array.from({ length: 11 }, (_, i) => ({
      ...recipientFixture('envelope_team_a'),
      id: i + 1,
      role: RecipientRole.CC,
    })),
    envelopeItems: [
      { id: 'item', documentData: { id: 'data', type: 'BYTES', data: 'synthetic', initialData: 'synthetic' } },
    ],
    team: { id: 10, url: 'team-a', organisation: { organisationClaim: { recipientCount: 0 } } },
  } as unknown as ReturnType<typeof envelopeFixture>;
  db.user.findFirst.mockResolvedValue({ disabled: false, emailVerified: new Date() });
  db.envelope.findFirst.mockImplementation(() => Promise.resolve(envelope));
  db.envelope.findFirstOrThrow.mockImplementation(() => Promise.resolve(envelope));
  db.team.findUniqueOrThrow.mockResolvedValue({ organisationId: 'trial_org' });
  db.team.findFirst.mockResolvedValue({
    organisationId: 'trial_org',
    organisation: { organisationClaim: { flags: {} } },
  });
  incrementTemplate.mockRejectedValue(new Error('creation admitted'));
  db.organisation.findUniqueOrThrow.mockResolvedValue({ id: 'trial_org', ownerUserId: 7, subscription: null });
  db.bizrethinkOrganisationBilling.findUnique.mockResolvedValue({ bizrethinkInternal: false });
  db.bizrethinkTrialOrganisation.findUnique.mockResolvedValue({ ownerUserId: 7 });
  db.bizrethinkTrialBudget.findUnique.mockResolvedValue({
    ownerUserId: 7,
    expiresAt: new Date(Date.now() + 60000),
    documentsUsed: 0,
    emailsUsed: 0,
  });
  db.bizrethinkInstanceResourcePolicy.findUnique.mockResolvedValue(null);
  db.$transaction.mockImplementation((operation) => operation(db));
});
it('A-11 prevents a trial from distributing more than ten recipients despite an unlimited claim', async () => {
  await expect(send()).rejects.toMatchObject({ code: 'RECIPIENT_LIMIT_EXCEEDED' });
  expect(jobs).not.toHaveBeenCalled();
});
it('A-11 expired trials cannot distribute already-created drafts', async () => {
  envelope.recipients = envelope.recipients.slice(0, 1);
  db.bizrethinkTrialBudget.findUnique.mockResolvedValue({
    ownerUserId: 7,
    expiresAt: new Date(0),
    documentsUsed: 0,
    emailsUsed: 0,
  });
  await expect(send()).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' });
  expect(jobs).not.toHaveBeenCalled();
});
it('preserves the approved internal recipient allowance', async () => {
  db.bizrethinkOrganisationBilling.findUnique.mockResolvedValue({ bizrethinkInternal: true });
  await expect(send()).resolves.toMatchObject({ id: envelope.id });
  expect(jobs).toHaveBeenCalledOnce();
});
it('accepts ten recipients during an active trial', async () => {
  envelope.recipients = envelope.recipients.slice(0, 10);
  await expect(send()).resolves.toMatchObject({ id: envelope.id });
  expect(jobs).toHaveBeenCalledOnce();
});

it('A-11 creating a template cannot bypass an exhausted document allowance', async () => {
  db.bizrethinkTrialBudget.findUnique.mockResolvedValue({
    ownerUserId: 7,
    expiresAt: new Date(Date.now() + 60000),
    documentsUsed: 5,
    emailsUsed: 0,
  });
  await expect(
    createEnvelope({
      userId: 7,
      teamId: 10,
      internalVersion: 2,
      requestMetadata: { source: 'app', requestMetadata: {}, auth: null },
      data: { type: EnvelopeType.TEMPLATE, title: 'Synthetic template', envelopeItems: [] },
    }),
  ).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' });
  expect(incrementTemplate).not.toHaveBeenCalled();
});
it('A-11 saving a document as a template cannot bypass an exhausted document allowance', async () => {
  db.bizrethinkTrialBudget.findUnique.mockResolvedValue({
    ownerUserId: 7,
    expiresAt: new Date(Date.now() + 60000),
    documentsUsed: 5,
    emailsUsed: 0,
  });
  await expect(
    duplicateEnvelope({
      userId: 7,
      teamId: 10,
      id: { type: 'envelopeId', id: envelope.id },
      overrides: { duplicateAsTemplate: true },
    }),
  ).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' });
  expect(incrementTemplate).not.toHaveBeenCalled();
});
it('preserves the existing internal save-as-template path', async () => {
  db.bizrethinkOrganisationBilling.findUnique.mockResolvedValue({ bizrethinkInternal: true });
  await expect(
    duplicateEnvelope({
      userId: 7,
      teamId: 10,
      id: { type: 'envelopeId', id: envelope.id },
      overrides: { duplicateAsTemplate: true },
    }),
  ).rejects.toThrow('creation admitted');
  expect(incrementTemplate).toHaveBeenCalledOnce();
});
it('A-11 an unverified external sender cannot distribute documents', async () => {
  envelope.recipients = envelope.recipients.slice(0, 1);
  db.user.findFirst.mockResolvedValue({ disabled: false, emailVerified: null });
  await expect(send()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  expect(jobs).not.toHaveBeenCalled();
});
