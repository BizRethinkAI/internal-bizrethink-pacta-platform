import { jobs } from '@documenso/lib/jobs/client';
import { extractDerivedDocumentEmailSettings } from '@documenso/lib/types/document-email';
import { mapSecondaryIdToDocumentId } from '@documenso/lib/utils/envelope';
import { isRecipientEmailValidForSending, sortRecipientsForSigningOrder } from '@documenso/lib/utils/recipients';
import type { DocumentMeta, Envelope, Recipient } from '@prisma/client';
import {
  DocumentDistributionMethod,
  DocumentSigningOrder,
  DocumentStatus,
  EnvelopeType,
  RecipientRole,
  SendStatus,
  SigningStatus,
} from '@prisma/client';

/** Schedule after commit. The existing job resolves the current token at delivery. */
export const deliverReassignedRecipient = async ({
  envelope,
  previous,
  current,
  recipients,
}: {
  envelope: Envelope & { documentMeta: DocumentMeta | null };
  previous: Recipient;
  current: Recipient;
  recipients: Recipient[];
}) => {
  if (
    current.token === previous.token ||
    previous.sendStatus !== SendStatus.SENT ||
    envelope.type !== EnvelopeType.DOCUMENT ||
    envelope.status !== DocumentStatus.PENDING ||
    envelope.documentMeta?.distributionMethod === DocumentDistributionMethod.NONE ||
    current.role === RecipientRole.CC ||
    !isRecipientEmailValidForSending(current) ||
    !extractDerivedDocumentEmailSettings(envelope.documentMeta).recipientSigningRequest
  ) {
    return;
  }
  if (envelope.documentMeta?.signingOrder === DocumentSigningOrder.SEQUENTIAL) {
    const pending = sortRecipientsForSigningOrder(recipients).find(
      (row) => row.role !== RecipientRole.CC && row.signingStatus !== SigningStatus.SIGNED,
    );
    if (pending?.id !== current.id) {
      return;
    }
  }
  await jobs.triggerJob({
    name: 'send.signing.requested.email',
    payload: {
      userId: envelope.userId,
      documentId: mapSecondaryIdToDocumentId(envelope.secondaryId),
      recipientId: current.id,
    },
  });
};
