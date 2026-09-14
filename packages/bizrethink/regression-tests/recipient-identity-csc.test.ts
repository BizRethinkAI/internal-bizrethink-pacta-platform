import { upsertCscCredential } from '@documenso/ee/server-only/signing/csc/credential';
import { updateCscSessionWithSad, upsertCscSession } from '@documenso/ee/server-only/signing/csc/sign-session';
import { beforeEach, expect, it, vi } from 'vitest';
import { envelopeFixture, recipientFixture } from './recipient-auth-fixture';

const db = vi.hoisted(() => ({
  recipient: { findFirst: vi.fn() },
  envelope: { findFirst: vi.fn() },
  cscCredential: { upsert: vi.fn() },
  cscSession: { upsert: vi.fn(), update: vi.fn() },
  $queryRaw: vi.fn(),
  $transaction: vi.fn(),
}));
vi.mock('@documenso/prisma', () => ({ prisma: db }));
const token = 'original-csc-test-token';
let currentToken: string;
const recipient = () => ({ ...recipientFixture('envelope_team_a'), token: currentToken });
const session = () => ({
  id: 'session_test',
  recipientId: 1,
  envelopeId: 'envelope_team_a',
  signingTime: new Date(),
  itemsJson: [],
  encryptedSad: null,
  sadExpiresAt: null,
  createdAt: new Date(),
});
const credential = {
  recipientId: 1,
  recipientToken: token,
  providerId: 'synthetic-provider',
  credentialId: 'synthetic-credential',
  certCache: new Uint8Array([1]),
  signatureAlgorithm: '1.2.840.113549.1.1.11',
  keyType: 'RSA',
  digestAlgorithm: 'SHA-256',
  keyLenBits: 2048,
  serviceTokenCiphertext: new Uint8Array([2]),
  serviceTokenExpiresAt: new Date('2099-01-01'),
};
const operations = [
  { name: 'service credential', write: db.cscCredential.upsert, run: () => upsertCscCredential(credential) },
  {
    name: 'prepared signing session',
    write: db.cscSession.upsert,
    run: () =>
      upsertCscSession({
        recipientId: 1,
        recipientToken: token,
        envelopeId: 'envelope_team_a',
        signingTime: new Date(),
        items: [],
      } as Parameters<typeof upsertCscSession>[0]),
  },
  {
    name: 'provider signing approval',
    write: db.cscSession.update,
    run: () =>
      updateCscSessionWithSad({
        sessionId: 'session_test',
        recipientToken: token,
        encryptedSad: new Uint8Array([3]),
        sadExpiresAt: new Date('2099-01-01'),
      } as Parameters<typeof updateCscSessionWithSad>[0]),
  },
];
beforeEach(() => {
  vi.resetAllMocks();
  currentToken = token;
  db.recipient.findFirst.mockImplementation(async ({ where }) => (where.token === currentToken ? recipient() : null));
  db.envelope.findFirst.mockImplementation(async () => ({
    ...envelopeFixture(),
    signatureLevel: 'AES',
    recipients: [recipient()],
    fields: [],
  }));
  db.cscCredential.upsert.mockResolvedValue({
    ...credential,
    id: 'credential_test',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  db.cscSession.upsert.mockImplementation(async () => session());
  db.cscSession.update.mockImplementation(async () => session());
  db.$transaction.mockImplementation(async (operation) => operation(db));
});
for (const operation of operations) {
  it(`A-19 does not attach an old identity's ${operation.name} after reassignment`, async () => {
    currentToken = 'replacement-csc-test-token';
    await expect(operation.run()).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(operation.write).not.toHaveBeenCalled();
  });
  it(`A-19 retains a current identity's ${operation.name}`, async () => {
    await operation.run();
    expect(operation.write).toHaveBeenCalledOnce();
  });
}
