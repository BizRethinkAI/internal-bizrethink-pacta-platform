import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { assertRecipientNotExpired } from '@documenso/lib/utils/recipients';
import { prisma } from '@documenso/prisma';
import { type DocumentMeta, type Envelope, type Field, Prisma, type Recipient, SigningStatus } from '@prisma/client';
import { isDeepEqual } from 'remeda';

/** Same parent -> recipient -> field lock order as document replacement. */
export const lockRecipientEnvelope = async (tx: Prisma.TransactionClient, envelopeId: string) => {
  await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Envelope" WHERE "id" = ${envelopeId} FOR UPDATE`);
  await tx.$queryRaw(
    Prisma.sql`SELECT "id" FROM "Recipient" WHERE "envelopeId" = ${envelopeId} ORDER BY "id" FOR UPDATE`,
  );
  await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Field" WHERE "envelopeId" = ${envelopeId} ORDER BY "id" FOR UPDATE`);
};

const sameAuthority = (current: Recipient, previous: Recipient) =>
  ['token', 'name', 'email', 'role', 'signingOrder', 'envelopeId'].every(
    (key) => current[key as keyof Recipient] === previous[key as keyof Recipient],
  ) && isDeepEqual(current.authOptions, previous.authOptions);

/** Reject prechecked authority superseded while a request was doing validation. */
export const assertCurrentRecipientAuthority = async (
  tx: Prisma.TransactionClient,
  {
    recipient,
    envelope,
    field,
  }: {
    recipient: Recipient;
    envelope: Pick<Envelope, 'id' | 'status' | 'authOptions' | 'signatureLevel'> & {
      documentMeta?: DocumentMeta | null;
    };
    field?: Field & { recipient: Recipient };
  },
) => {
  await lockRecipientEnvelope(tx, envelope.id);
  const current = await tx.envelope.findFirst({
    where: { id: envelope.id },
    include: { recipients: true, fields: true, documentMeta: true },
  });
  const actor = current?.recipients.find((row) => row.id === recipient.id);
  const target = field && current?.recipients.find((row) => row.id === field.recipientId);
  if (
    !current ||
    current.deletedAt ||
    !actor ||
    !sameAuthority(actor, recipient) ||
    (field && (!target || !sameAuthority(target, field.recipient)))
  ) {
    throw new AppError(AppErrorCode.NOT_FOUND, { message: 'Recipient authority is no longer current' });
  }
  if (actor.signingStatus === SigningStatus.SIGNED || target?.signingStatus === SigningStatus.SIGNED) {
    throw new AppError(AppErrorCode.RECIPIENT_ALREADY_SIGNED, { statusCode: 400 });
  }
  if (
    (envelope.documentMeta !== undefined &&
      (current.documentMeta?.signingOrder !== envelope.documentMeta?.signingOrder ||
        current.documentMeta?.allowDictateNextSigner !== envelope.documentMeta?.allowDictateNextSigner)) ||
    current.status !== envelope.status ||
    current.signatureLevel !== envelope.signatureLevel ||
    !isDeepEqual(current.authOptions, envelope.authOptions) ||
    actor.signingStatus !== recipient.signingStatus
  ) {
    throw new AppError(AppErrorCode.NOT_FOUND, { message: 'Signing policy changed; reload the document' });
  }
  assertRecipientNotExpired(actor);
  if (target) {
    assertRecipientNotExpired(target);
  }
  if (field) {
    const saved = current.fields.find((row) => row.id === field.id);
    if (
      !saved ||
      saved.recipientId !== field.recipientId ||
      saved.type !== field.type ||
      saved.inserted !== field.inserted ||
      !isDeepEqual(saved.fieldMeta, field.fieldMeta)
    ) {
      throw new AppError(AppErrorCode.NOT_FOUND, { message: 'Field changed; reload the document' });
    }
  }
  return current;
};

/** Provider calls happen outside; only the final local proof write holds locks. */
export const withCurrentCscRecipient = async <T>(
  token: string,
  operation: (tx: Prisma.TransactionClient, recipient: Recipient) => Promise<T>,
): Promise<T> => {
  return prisma.$transaction(async (tx) => {
    const before = await tx.recipient.findFirst({ where: { token } });
    if (!before) {
      throw new AppError(AppErrorCode.NOT_FOUND);
    }
    await lockRecipientEnvelope(tx, before.envelopeId);
    const current = await tx.recipient.findFirst({ where: { id: before.id, token } });
    const envelope = await tx.envelope.findFirst({ where: { id: before.envelopeId } });
    if (
      !current ||
      !envelope ||
      envelope.deletedAt ||
      !['DRAFT', 'PENDING'].includes(envelope.status) ||
      current.signingStatus === SigningStatus.SIGNED ||
      current.signingStatus === SigningStatus.REJECTED
    ) {
      throw new AppError(AppErrorCode.NOT_FOUND);
    }
    assertRecipientNotExpired(current);
    return operation(tx, current);
  });
};
