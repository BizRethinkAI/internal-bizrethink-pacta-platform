import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import type { Field, Recipient } from '@prisma/client';
import { RecipientRole } from '@prisma/client';

import { isRecipientSignatureField } from '../recipient-auth-policy';

/** Authorize the field and retain its identity/type in the transaction's update. */
export const authorizeAssistantFieldMutation = ({
  recipient,
  field,
}: {
  recipient: Pick<Recipient, 'id' | 'role'>;
  field: Pick<Field, 'type' | 'recipientId' | 'envelopeId'>;
}): Partial<Pick<Field, 'type' | 'recipientId' | 'envelopeId'>> => {
  if (recipient.role !== RecipientRole.ASSISTANT) {
    return {};
  }
  if (recipient.id !== field.recipientId && isRecipientSignatureField(field.type)) {
    throw new AppError(AppErrorCode.INVALID_REQUEST, {
      message: "Assistant recipients cannot modify another recipient's signature fields",
    });
  }

  // A concurrent sender edit must not turn an authorized ordinary field into
  // another recipient's signature, or move it, before the assistant's write.
  // The field update and any signature/audit writes share one transaction.
  return { type: field.type, recipientId: field.recipientId, envelopeId: field.envelopeId };
};
