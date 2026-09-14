// MODIFIED for BizRethink (overlay 088): rotate reassigned bearer authority under the authoring lock.

import { withDocumentReplacement } from '@bizrethink/customizations/server-only/document-replacement';
import { recipientIdentityReset } from '@bizrethink/customizations/server-only/recipient-identity';
import { generateAvaliableRecipientPlaceholder } from '@documenso/lib/utils/templates';
import { EnvelopeType } from '@prisma/client';
import { getEnvelopeWhereInput } from '../envelope/get-envelope-by-id';

export type DeleteTemplateDirectLinkOptions = {
  templateId: number;
  userId: number;
  teamId: number;
};

export const deleteTemplateDirectLink = async ({
  templateId,
  userId,
  teamId,
}: DeleteTemplateDirectLinkOptions): Promise<void> => {
  const { envelopeWhereInput } = await getEnvelopeWhereInput({
    id: {
      type: 'templateId',
      id: templateId,
    },
    type: EnvelopeType.TEMPLATE,
    userId,
    teamId,
  });

  return withDocumentReplacement(envelopeWhereInput, async ({ tx, envelope }) => {
    const { directLink } = envelope;

    if (!directLink) {
      return;
    }

    await tx.recipient.update({
      where: {
        envelopeId: envelope.id,
        id: directLink.directTemplateRecipientId,
      },
      data: {
        ...(await recipientIdentityReset(
          tx,
          envelope.recipients.find((row) => row.id === directLink.directTemplateRecipientId),
          generateAvaliableRecipientPlaceholder(envelope.recipients),
          envelope.fields,
        )),
        ...generateAvaliableRecipientPlaceholder(envelope.recipients),
      },
    });

    await tx.templateDirectLink.delete({
      where: {
        envelopeId: envelope.id,
      },
    });
  });
};
