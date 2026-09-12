import type { TEnvelope } from '@documenso/lib/types/envelope';
import type { TEnvelopeRecipientLite } from '@documenso/lib/types/recipient';
import {
  DocumentDistributionMethod,
  DocumentSigningOrder,
  DocumentSource,
  DocumentStatus,
  DocumentVisibility,
  EnvelopeType,
  ReadStatus,
  RecipientRole,
  SendStatus,
  SigningStatus,
  TemplateType,
} from '@prisma/client';

export const recipientFixture = (envelopeId: string): TEnvelopeRecipientLite => ({
  id: 1,
  envelopeId,
  email: 'owner@example.invalid',
  name: 'Synthetic recipient',
  token: 'synthetic-recipient-token',
  role: RecipientRole.SIGNER,
  readStatus: ReadStatus.NOT_OPENED,
  signingStatus: SigningStatus.NOT_SIGNED,
  sendStatus: SendStatus.NOT_SENT,
  documentDeletedAt: null,
  expired: null,
  expiresAt: null,
  expirationNotifiedAt: null,
  signedAt: null,
  authOptions: null,
  signingOrder: null,
  rejectionReason: null,
});

export const envelopeFixture = (overrides: Partial<TEnvelope> = {}): TEnvelope => ({
  id: 'envelope_team_a',
  secondaryId: 'document_1',
  internalVersion: 2,
  type: EnvelopeType.DOCUMENT,
  status: DocumentStatus.DRAFT,
  source: DocumentSource.DOCUMENT,
  visibility: DocumentVisibility.EVERYONE,
  templateType: TemplateType.PRIVATE,
  externalId: null,
  createdAt: new Date('2026-09-12T00:00:00Z'),
  updatedAt: new Date('2026-09-12T00:00:00Z'),
  completedAt: null,
  deletedAt: null,
  title: 'Synthetic team A document',
  authOptions: null,
  formValues: null,
  publicTitle: '',
  publicDescription: '',
  userId: 7,
  teamId: 10,
  folderId: null,
  templateId: null,
  documentMeta: {
    id: 'meta_test',
    signingOrder: DocumentSigningOrder.PARALLEL,
    distributionMethod: DocumentDistributionMethod.EMAIL,
    subject: null,
    message: null,
    timezone: 'Etc/UTC',
    dateFormat: 'yyyy-MM-dd',
    redirectUrl: null,
    typedSignatureEnabled: true,
    uploadSignatureEnabled: true,
    drawSignatureEnabled: true,
    allowDictateNextSigner: false,
    language: 'en',
    emailSettings: null,
    emailId: null,
    emailReplyTo: null,
    envelopeExpirationPeriod: null,
  },
  recipients: [],
  fields: [],
  envelopeItems: [],
  directLink: null,
  team: { id: 10, url: 'team-a' },
  user: { id: 7, name: 'Synthetic owner', email: 'owner@example.invalid' },
  ...overrides,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Interpret the small Prisma predicate subset used by these real handlers.
 * This is a database double, not an alternative authorization policy: it knows
 * nothing about users, teams or permissions. Unknown operators fail loudly.
 * The companion Playwright spec exercises PostgreSQL and HTTP without this double.
 */
export const matchesQuery = (record: Record<string, unknown>, query: Record<string, unknown>): boolean =>
  Object.entries(query).every(([key, expected]) => {
    if (expected === undefined) {
      return true;
    }

    if (key === 'OR' || key === 'AND') {
      const operands = Array.isArray(expected) ? expected : [expected];
      const results = operands.map((operand) => {
        if (!isRecord(operand)) {
          throw new Error('Unsupported query operand');
        }
        return matchesQuery(record, operand);
      });
      return key === 'OR' ? results.some(Boolean) : results.every(Boolean);
    }

    if (!(key in record)) {
      throw new Error(`Unsupported fixture column: ${key}`);
    }

    const actual = record[key];
    if (isRecord(expected)) {
      if (Object.keys(expected).length === 1 && Array.isArray(expected.in)) {
        return expected.in.includes(actual);
      }
      if (Object.keys(expected).length === 1 && 'not' in expected) {
        return actual !== expected.not;
      }
      if (!isRecord(actual)) {
        throw new Error(`Unsupported query filter: ${key}`);
      }
      return matchesQuery(actual, expected);
    }

    return actual === expected;
  });
