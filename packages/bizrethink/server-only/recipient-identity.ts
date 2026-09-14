import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { nanoid } from '@documenso/lib/universal/id';
import { canRecipientBeModified } from '@documenso/lib/utils/recipients';
import {
  type Field,
  type Prisma,
  ReadStatus,
  type Recipient,
  RecipientRole,
  SendStatus,
  SigningStatus,
} from '@prisma/client';

type Identity = Pick<Recipient, 'name' | 'email' | 'role'>;

export const hasRecipientIdentityChanged = (previous: Identity, next: Partial<Identity>) =>
  (next.email !== undefined && previous.email.toLowerCase() !== next.email.toLowerCase()) ||
  (next.name !== undefined && previous.name !== next.name) ||
  (next.role !== undefined && previous.role !== next.role);

/** Call only inside the locked authoring transaction, before saving the new identity. */
export const recipientIdentityReset = async (
  tx: Prisma.TransactionClient,
  previous: Recipient | undefined,
  next: Partial<Identity>,
  fields: Pick<Field, 'recipientId' | 'inserted'>[],
): Promise<Prisma.RecipientUpdateManyMutationInput> => {
  if (!previous || !hasRecipientIdentityChanged(previous, next)) {
    return {};
  }
  if (!canRecipientBeModified(previous, fields)) {
    throw new AppError(AppErrorCode.INVALID_REQUEST, {
      message: 'Cannot change a recipient who has already interacted with the document',
    });
  }
  await tx.cscSession.deleteMany({ where: { recipientId: previous.id } });
  await tx.cscCredential.deleteMany({ where: { recipientId: previous.id } });
  const isCc = (next.role ?? previous.role) === RecipientRole.CC;
  return {
    token: nanoid(),
    readStatus: ReadStatus.NOT_OPENED,
    sendStatus: isCc ? SendStatus.SENT : SendStatus.NOT_SENT,
    signingStatus: isCc ? SigningStatus.SIGNED : SigningStatus.NOT_SIGNED,
    sentAt: null,
    signedAt: null,
    rejectionReason: null,
    lastReminderSentAt: null,
    nextReminderAt: null,
    reminderCount: 0,
  };
};
