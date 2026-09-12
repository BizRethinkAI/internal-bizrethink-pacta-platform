import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import type { TDocumentAuth, TDocumentAuthMethods } from '@documenso/lib/types/document-auth';
import { DocumentAuth } from '@documenso/lib/types/document-auth';
import { extractDocumentAuthMethods } from '@documenso/lib/utils/document-auth';
import { prisma } from '@documenso/prisma';
import type { Envelope, Recipient } from '@prisma/client';
import { DocumentStatus, EnvelopeType } from '@prisma/client';

type RecipientIdentity = Pick<Recipient, 'email' | 'authOptions' | 'envelopeId'>;
type RecipientAccessOptions = {
  recipient: RecipientIdentity;
  documentAuthOptions: Envelope['authOptions'];
  /** Authenticated session identity from the server, never an input userId. */
  userId?: number;
};

const isRecipientAccount = async (email: string, userId: number | undefined) => {
  if (!userId || !email) {
    return false;
  }
  // Match the existing ACCOUNT branch's exact email semantics. A DB error is
  // propagated, never interpreted as permission to drop the account gate.
  const account = await prisma.user.findFirst({ where: { email }, select: { id: true, disabled: true } });
  return account?.id === userId && account.disabled === false;
};

/** Enforce the account access setting independently of signature ACTION auth. */
export const assertRecipientAccess = async ({ recipient, documentAuthOptions, userId }: RecipientAccessOptions) => {
  const { derivedRecipientAccessAuth } = extractDocumentAuthMethods({
    documentAuth: documentAuthOptions,
    recipientAuth: recipient.authOptions,
  });
  if (
    derivedRecipientAccessAuth.includes(DocumentAuth.ACCOUNT) &&
    !(await isRecipientAccount(recipient.email, userId))
  ) {
    throw new AppError(AppErrorCode.UNAUTHORIZED, { message: 'Recipient account authentication required' });
  }
  // Upstream deliberately verifies access 2FA at completion. Preserve that
  // timing: a read/ordinary field edit does not consume the completion code.
};

/** Run before isRecipientAuthorized's permissive/individual-factor branches. */
export const isRecipientFactorIdentityValid = async ({
  type,
  authMethods,
  authOptions,
  recipientEmail,
  userId,
}: {
  type: 'ACCESS' | 'ACCESS_2FA' | 'ACTION';
  authMethods: TDocumentAuth[];
  authOptions?: TDocumentAuthMethods;
  recipientEmail: string;
  userId?: number;
}): Promise<boolean> => {
  // At completion, ACCOUNT proves identity but cannot replace a configured
  // second factor. ACCESS itself still defers that code to completion.
  if (
    type === 'ACCESS_2FA' &&
    authMethods.includes(DocumentAuth.TWO_FACTOR_AUTH) &&
    authOptions?.type !== DocumentAuth.TWO_FACTOR_AUTH
  ) {
    return false;
  }
  // Access settings are cumulative in the signing UI. Supplying a 2FA method
  // must not make an accompanying ACCOUNT setting disappear.
  const needsAccessAccount = type !== 'ACTION' && authMethods.includes(DocumentAuth.ACCOUNT);
  const hasSelectedFactor =
    authOptions !== undefined &&
    authMethods.includes(authOptions.type) &&
    !authMethods.includes(DocumentAuth.EXPLICIT_NONE);
  const isAccountFactor =
    hasSelectedFactor &&
    (authOptions.type === DocumentAuth.PASSWORD ||
      authOptions.type === DocumentAuth.PASSKEY ||
      (authOptions.type === DocumentAuth.TWO_FACTOR_AUTH &&
        type !== 'ACCESS' &&
        !(type === 'ACCESS_2FA' && authOptions.method === 'email')));
  if (!needsAccessAccount && !isAccountFactor) {
    return true;
  }
  return await isRecipientAccount(recipientEmail, userId);
};

/** Shared revocation check; mutation helpers keep their existing status errors. */
export const assertRecipientEnvelopeNotDeleted = (envelope: Pick<Envelope, 'deletedAt'>) => {
  if (envelope.deletedAt) {
    throw new AppError(AppErrorCode.NOT_FOUND, { message: 'Document not found' });
  }
};

/** A draft or deleted envelope is not a recipient document download. */
export const assertRecipientEnvelopeReadable = (envelope: Pick<Envelope, 'deletedAt' | 'status'>) => {
  assertRecipientEnvelopeNotDeleted(envelope);
  if (envelope.status === DocumentStatus.DRAFT) {
    throw new AppError(AppErrorCode.NOT_FOUND, { message: 'Document not found' });
  }
};

/** Gate public token adapters using persisted policy and the actual recipient. */
export const assertRecipientTokenAccess = async ({
  token,
  userId,
  envelopeId,
}: {
  token: string;
  userId?: number;
  envelopeId?: string;
}) => {
  if (!token) {
    throw new AppError(AppErrorCode.NOT_FOUND, { message: 'Document not found' });
  }
  const recipient = await prisma.recipient.findFirst({
    where: { token, envelope: { type: EnvelopeType.DOCUMENT, ...(envelopeId ? { id: envelopeId } : {}) } },
    include: { envelope: true },
  });
  if (!recipient) {
    throw new AppError(AppErrorCode.NOT_FOUND, { message: 'Document not found' });
  }
  assertRecipientEnvelopeReadable(recipient.envelope);
  await assertRecipientAccess({ recipient, documentAuthOptions: recipient.envelope.authOptions, userId });
  // Owner decision: expiry is a signing deadline, not read revocation.
  // Mutation helpers separately enforce expiry, status, signing order and CAS.
  return recipient;
};
