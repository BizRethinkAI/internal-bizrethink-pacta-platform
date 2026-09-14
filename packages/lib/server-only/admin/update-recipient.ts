import { withDocumentReplacement } from '@bizrethink/customizations/server-only/document-replacement';
// MODIFIED for BizRethink (overlay 088): rotate reassigned bearer authority under the authoring lock.
import { recipientIdentityReset } from '@bizrethink/customizations/server-only/recipient-identity';
import { deliverReassignedRecipient } from '@bizrethink/customizations/server-only/recipient-identity-delivery';
import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { prisma } from '@documenso/prisma';
import { type RecipientRole, SigningStatus } from '@prisma/client';

export type UpdateRecipientOptions = {
  id: number;
  name: string | undefined;
  email: string | undefined;
  role: RecipientRole | undefined;
};

export const updateRecipient = async ({ id, name, email, role }: UpdateRecipientOptions) => {
  const recipient = await prisma.recipient.findFirstOrThrow({
    where: {
      id,
    },
  });

  return withDocumentReplacement({ id: recipient.envelopeId }, async ({ tx, envelope, afterCommit }) => {
    const current = envelope.recipients.find((row) => row.id === id);
    if (!current) {
      throw new AppError(AppErrorCode.NOT_FOUND);
    }
    if (current.signingStatus === SigningStatus.SIGNED) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, {
        message: 'Cannot update a recipient that has already signed.',
      });
    }

    const updated = await tx.recipient.update({
      where: {
        id,
      },
      data: {
        ...(await recipientIdentityReset(tx, current, { name, email, role }, envelope.fields)),
        name,
        email,
        role,
      },
    });
    afterCommit(() =>
      deliverReassignedRecipient({
        envelope,
        previous: current,
        current: updated,
        recipients: envelope.recipients.map((row) => (row.id === updated.id ? updated : row)),
      }),
    );
    return updated;
  });
};
