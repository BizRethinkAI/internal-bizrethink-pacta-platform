import { executeTspSign } from '@documenso/ee/server-only/signing/csc/execute-tsp-sign';
import { DocumentStatus, SigningStatus } from '@prisma/client';
import { beforeEach, expect, it, vi } from 'vitest';
import { envelopeFixture, recipientFixture } from './recipient-auth-fixture';

const mocks = vi.hoisted(() => ({
  db: {
    envelope: { findUniqueOrThrow: vi.fn(), findFirst: vi.fn(), findFirstOrThrow: vi.fn() },
    recipient: { findFirst: vi.fn(), findFirstOrThrow: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    documentData: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
    documentAuditLog: { create: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  },
  consume: vi.fn(),
  jobs: vi.fn(),
  webhook: vi.fn(),
  loadSession: vi.fn(),
  loadCredential: vi.fn(),
}));
vi.mock('@documenso/prisma', () => ({ prisma: mocks.db }));
vi.mock('@documenso/lib/jobs/client', () => ({ jobs: { triggerJob: mocks.jobs } }));
vi.mock('@documenso/lib/server-only/webhooks/trigger/trigger-webhook', () => ({ triggerWebhook: mocks.webhook }));
vi.mock('@documenso/ee/server-only/signing/csc/sign-session', () => ({
  loadCscSession: mocks.loadSession,
  consumeCscSession: mocks.consume,
}));
vi.mock('@documenso/ee/server-only/signing/csc/credential', () => ({ loadCscCredential: mocks.loadCredential }));
// Only provider/cryptographic/storage boundaries are synthetic; the final
// document/recipient transaction and authority check execute unchanged.
vi.mock('@documenso/ee/server-only/signing/csc/cert-chain', () => ({
  decodeCscCertChain: () => [new Uint8Array([1])],
}));
vi.mock('@documenso/ee/server-only/signing/csc/ciphers', () => ({ decryptCscToken: () => 'synthetic' }));
vi.mock('@documenso/ee/server-only/signing/csc/transport', () => ({
  getCscTransport: async () => ({ serviceBaseUrl: 'https://provider.invalid' }),
}));
vi.mock('@documenso/ee/server-only/signing/csc/tsa-resolver', () => ({ resolveCscSignTimeTsa: () => undefined }));
vi.mock('@documenso/ee/server-only/signing/csc/client/signatures', () => ({
  cscSignHash: async () => ({ signatures: ['Bw=='] }),
}));
vi.mock('@documenso/ee/server-only/signing/csc/signers/capture-signer', () => ({
  CscCaptureSigner: vi.fn(function captureSigner() {
    return { capturedDigest: new Uint8Array([7]) };
  }),
}));
vi.mock('@documenso/ee/server-only/signing/csc/signers/fifo-signer', () => ({
  CscFifoSigner: vi.fn(function fifoSigner() {
    return {};
  }),
}));
vi.mock('@libpdf/core', () => ({
  PDF: { load: async () => ({ sign: async () => ({ bytes: new Uint8Array([9]) }) }) },
}));
vi.mock('@documenso/lib/universal/upload/get-file.server', () => ({
  getFileServerSide: async () => new Uint8Array([1]),
}));
vi.mock('@documenso/lib/universal/upload/put-file.server', () => ({
  putPdfFileServerSide: async () => ({
    documentData: { id: 'rendered_test', type: 'BYTES', data: 'replacement bytes' },
  }),
}));
const token = 'original-csc-test-token';
let currentRecipient = recipientFixture('envelope_team_a');
let reassign: boolean;
let completeBeforeCommit: boolean;
const snapshot = () => ({
  ...envelopeFixture({ status: DocumentStatus.PENDING }),
  signatureLevel: 'AES',
  recipients: [{ ...currentRecipient }],
  fields: [],
  envelopeItems: [
    {
      id: 'item_test',
      envelopeId: 'envelope_team_a',
      title: 'Synthetic PDF',
      order: 0,
      documentDataId: 'data_test',
      documentData: { id: 'data_test', type: 'BYTES', data: 'old bytes', initialData: 'old bytes' },
    },
  ],
});
beforeEach(() => {
  vi.resetAllMocks();
  reassign = false;
  completeBeforeCommit = false;
  currentRecipient = { ...recipientFixture('envelope_team_a'), token };
  mocks.db.recipient.findFirst.mockImplementation(async () => ({ ...currentRecipient, envelope: snapshot() }));
  mocks.db.recipient.findFirstOrThrow.mockImplementation(async () => ({ ...currentRecipient, fields: [] }));
  mocks.db.recipient.findMany.mockResolvedValue([]);
  mocks.db.recipient.update.mockImplementation(async ({ data }) => {
    currentRecipient = { ...currentRecipient, ...data };
    return { ...currentRecipient };
  });
  mocks.db.envelope.findUniqueOrThrow.mockImplementation(async () => snapshot());
  mocks.db.envelope.findFirst.mockImplementation(async () => snapshot());
  mocks.db.envelope.findFirstOrThrow.mockImplementation(async () => snapshot());
  mocks.db.documentData.findUniqueOrThrow.mockResolvedValue({ id: 'prepared_test', type: 'BYTES', data: 'prepared' });
  mocks.loadSession.mockResolvedValue({
    id: 'csc_test',
    recipientId: 1,
    envelopeId: 'envelope_team_a',
    encryptedSad: new Uint8Array([2]),
    sadExpiresAt: new Date('2099-01-01'),
    signingTime: new Date(),
    items: [{ envelopeItemId: 'item_test', documentDataId: 'prepared_test', hashB64: 'Bw==', ordinal: 0 }],
  });
  mocks.loadCredential.mockResolvedValue({
    certCache: new Uint8Array([1]),
    serviceTokenCiphertext: new Uint8Array([2]),
    serviceTokenExpiresAt: new Date('2099-01-01'),
    keyLenBits: 2048,
    keyType: 'RSA',
    digestAlgorithm: 'SHA-256',
    signatureAlgorithm: '1.2.840.113549.1.1.11',
    providerId: 'synthetic',
    credentialId: 'synthetic',
  });
  mocks.db.$transaction.mockImplementation(async (operation) => {
    if (reassign) {
      currentRecipient = {
        ...currentRecipient,
        token: 'replacement-csc-test-token',
        email: 'replacement@example.invalid',
      };
    }
    if (completeBeforeCommit) {
      currentRecipient = { ...currentRecipient, signingStatus: SigningStatus.SIGNED };
    }
    return operation(mocks.db);
  });
});
it('A-19 a provider response cannot attach signed bytes or complete a reassigned recipient', async () => {
  reassign = true;
  await expect(executeTspSign({ sessionId: 'csc_test', recipientToken: token })).rejects.toMatchObject({
    code: 'NOT_FOUND',
  });
  expect(mocks.db.documentData.update).not.toHaveBeenCalled();
  expect(mocks.db.recipient.update).not.toHaveBeenCalled();
  expect(mocks.db.documentAuditLog.create).not.toHaveBeenCalled();
  expect(mocks.consume).not.toHaveBeenCalled();
  expect(mocks.jobs).not.toHaveBeenCalled();
  expect(mocks.webhook).not.toHaveBeenCalled();
});
it('A-19 preserves the provider completion path for unchanged authority', async () => {
  expect(await executeTspSign({ sessionId: 'csc_test', recipientToken: token })).toEqual({ outcome: 'signed' });
  expect(mocks.db.documentData.update).toHaveBeenCalledOnce();
  expect(currentRecipient.signingStatus).toBe(SigningStatus.SIGNED);
  expect(mocks.consume).toHaveBeenCalledOnce();
});

it('A-19 retains idempotent success if another current-token request completed first', async () => {
  completeBeforeCommit = true;
  expect(await executeTspSign({ sessionId: 'csc_test', recipientToken: token })).toEqual({ outcome: 'already_signed' });
  expect(mocks.db.documentData.update).not.toHaveBeenCalled();
  expect(mocks.consume).not.toHaveBeenCalled();
  expect(mocks.jobs).not.toHaveBeenCalled();
});
