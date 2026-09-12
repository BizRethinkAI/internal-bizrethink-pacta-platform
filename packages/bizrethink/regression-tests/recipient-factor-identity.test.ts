import { isRecipientAuthorized } from '@documenso/lib/server-only/document/is-recipient-authorized';
import { validateFieldAuth } from '@documenso/lib/server-only/document/validate-field-auth';
import type { TDocumentAuthMethods } from '@documenso/lib/types/document-auth';
import { DocumentAuth } from '@documenso/lib/types/document-auth';
import { hash } from '@node-rs/bcrypt';
import { FieldType } from '@prisma/client';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { fieldFixture } from './recipient-auth-fixture';

const { db, verifyPasskey, verifyTotp, verifyEmailCode } = vi.hoisted(() => ({
  db: {
    user: { findFirst: vi.fn(), findUnique: vi.fn() },
    passkey: { findFirst: vi.fn(), update: vi.fn() },
    verificationToken: { delete: vi.fn() },
  },
  verifyPasskey: vi.fn(),
  verifyTotp: vi.fn(),
  verifyEmailCode: vi.fn(),
}));
vi.mock('@documenso/prisma', () => ({ prisma: db }));
vi.mock('@simplewebauthn/server', () => ({ verifyAuthenticationResponse: verifyPasskey }));
vi.mock('@documenso/lib/server-only/2fa/verify-2fa-token', () => ({ verifyTwoFactorAuthenticationToken: verifyTotp }));
vi.mock('@documenso/lib/server-only/2fa/email/validate-2fa-token-from-email', () => ({
  validateTwoFactorTokenFromEmail: verifyEmailCode,
}));
vi.mock('@documenso/lib/utils/authenticator', () => ({
  getAuthenticatorOptions: () => ({ rpId: 'audit.invalid', origin: 'https://audit.invalid' }),
}));

const recipient = { email: 'alice@example.invalid', envelopeId: 'envelope_test', authOptions: null };
let passwordHash: string;
beforeAll(async () => {
  passwordHash = await hash('synthetic-valid-password', 4);
});
beforeEach(() => {
  vi.clearAllMocks();
  db.user.findFirst.mockImplementation(async ({ where }: { where: { email?: string; id?: number } }) => {
    if (where.email) {
      return where.email === recipient.email ? { id: 7, email: recipient.email, disabled: false } : null;
    }
    return { id: where.id, email: where.id === 7 ? recipient.email : 'bob@example.invalid', disabled: false };
  });
  db.user.findUnique.mockResolvedValue({ id: 8, password: passwordHash });
  db.passkey.findFirst.mockImplementation(async ({ where }: { where: { userId: number } }) => ({
    id: 'passkey_test',
    userId: where.userId,
    credentialId: new Uint8Array([1]),
    credentialPublicKey: new Uint8Array([2]),
    counter: 0,
  }));
  db.verificationToken.delete.mockResolvedValue({ token: 'challenge_test', expires: new Date(Date.now() + 60_000) });
  db.passkey.update.mockResolvedValue({});
  verifyPasskey.mockResolvedValue({ verified: true, authenticationInfo: { newCounter: 1 } });
  verifyTotp.mockResolvedValue(true);
  verifyEmailCode.mockResolvedValue(true);
});

const factorCases: { label: string; options: Exclude<TDocumentAuthMethods, { type: 'EXPLICIT_NONE' }> }[] = [
  {
    label: 'password (real bcrypt verification)',
    options: { type: DocumentAuth.PASSWORD, password: 'synthetic-valid-password' },
  },
  {
    label: 'passkey',
    options: {
      type: DocumentAuth.PASSKEY,
      tokenReference: 'challenge_test',
      authenticationResponse: {
        id: 'AQ',
        rawId: 'AQ',
        type: 'public-key',
        clientExtensionResults: {},
        response: { clientDataJSON: 'test', authenticatorData: 'test', signature: 'test' },
      },
    },
  },
  { label: 'authenticator', options: { type: DocumentAuth.TWO_FACTOR_AUTH, method: 'authenticator', token: '123456' } },
];

describe('A-05 recipient factor identity', () => {
  for (const { label, options } of factorCases) {
    it(`rejects another logged-in account's own valid ${label}`, async () => {
      const allowed = await isRecipientAuthorized({
        type: 'ACTION',
        recipient,
        userId: 8,
        authOptions: options,
        documentAuthOptions: { globalAccessAuth: [], globalActionAuth: [options.type] },
      });
      expect(allowed).toBe(false);
    });
    it(`keeps the intended recipient's valid ${label} working`, async () => {
      const allowed = await isRecipientAuthorized({
        type: 'ACTION',
        recipient,
        userId: 7,
        authOptions: options,
        documentAuthOptions: { globalAccessAuth: [], globalActionAuth: [options.type] },
      });
      expect(allowed).toBe(true);
    });
  }

  it('binds access authenticator verification to the recipient too', async () => {
    expect(
      await isRecipientAuthorized({
        type: 'ACCESS_2FA',
        recipient,
        userId: 8,
        documentAuthOptions: { globalAccessAuth: [DocumentAuth.TWO_FACTOR_AUTH], globalActionAuth: [] },
        authOptions: { type: DocumentAuth.TWO_FACTOR_AUTH, method: 'authenticator', token: '123456' },
      }),
    ).toBe(false);
  });

  it('keeps email-code completion usable without an account', async () => {
    expect(
      await isRecipientAuthorized({
        type: 'ACCESS_2FA',
        recipient,
        documentAuthOptions: { globalAccessAuth: [DocumentAuth.TWO_FACTOR_AUTH], globalActionAuth: [] },
        authOptions: { type: DocumentAuth.TWO_FACTOR_AUTH, method: 'email', token: '123456' },
      }),
    ).toBe(true);
    expect(verifyEmailCode).toHaveBeenCalledWith(
      expect.objectContaining({ email: recipient.email, envelopeId: recipient.envelopeId }),
    );
  });

  it.each([
    'email',
    'authenticator',
  ] as const)('requires ACCOUNT alongside a valid %s code when both access settings are present', async (method) => {
    expect(
      await isRecipientAuthorized({
        type: 'ACCESS_2FA',
        recipient,
        userId: 8,
        documentAuthOptions: {
          globalAccessAuth: [DocumentAuth.ACCOUNT, DocumentAuth.TWO_FACTOR_AUTH],
          globalActionAuth: [],
        },
        authOptions: { type: DocumentAuth.TWO_FACTOR_AUTH, method, token: '123456' },
      }),
    ).toBe(false);
  });

  it('still rejects another account for ACCOUNT access', async () => {
    expect(
      await isRecipientAuthorized({
        type: 'ACCESS',
        recipient,
        userId: 8,
        documentAuthOptions: { globalAccessAuth: [DocumentAuth.ACCOUNT], globalActionAuth: [] },
      }),
    ).toBe(false);
  });

  it('does not let an authenticator option bypass ACCOUNT when both access requirements are configured', async () => {
    expect(
      await isRecipientAuthorized({
        type: 'ACCESS',
        recipient,
        userId: 8,
        documentAuthOptions: {
          globalAccessAuth: [DocumentAuth.ACCOUNT, DocumentAuth.TWO_FACTOR_AUTH],
          globalActionAuth: [],
        },
        authOptions: { type: DocumentAuth.TWO_FACTOR_AUTH, method: 'authenticator', token: '123456' },
      }),
    ).toBe(false);
  });
});

describe('A-05 field access independently of signature action auth', () => {
  it.each([
    FieldType.TEXT,
    FieldType.SIGNATURE,
    FieldType.FREE_SIGNATURE,
  ])('requires the recipient account before inserting %s even with no action auth', async (type) => {
    await expect(
      validateFieldAuth({
        field: fieldFixture(type),
        recipient,
        documentAuthOptions: { globalAccessAuth: [DocumentAuth.ACCOUNT], globalActionAuth: [] },
      }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('requires signature action verification for FREE_SIGNATURE', async () => {
    await expect(
      validateFieldAuth({
        field: fieldFixture(FieldType.FREE_SIGNATURE),
        recipient,
        documentAuthOptions: { globalAccessAuth: [], globalActionAuth: [DocumentAuth.PASSWORD] },
      }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('allows ordinary fields for the correct recipient under ACCOUNT access', async () => {
    await expect(
      validateFieldAuth({
        field: fieldFixture(),
        recipient,
        userId: 7,
        documentAuthOptions: { globalAccessAuth: [DocumentAuth.ACCOUNT], globalActionAuth: [] },
      }),
    ).resolves.toBeUndefined();
  });

  it('preserves deliberately configured link-only signing', async () => {
    await expect(
      validateFieldAuth({ field: fieldFixture(FieldType.SIGNATURE), recipient, documentAuthOptions: null }),
    ).resolves.toBeUndefined();
  });
});
