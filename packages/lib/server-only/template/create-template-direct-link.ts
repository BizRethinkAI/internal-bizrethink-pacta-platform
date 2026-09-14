// MODIFIED for BizRethink (overlay 088): rotate reassigned bearer authority under the authoring lock.

import { withDocumentReplacement } from '@bizrethink/customizations/server-only/document-replacement';
import { recipientIdentityReset } from '@bizrethink/customizations/server-only/recipient-identity';
import {
  DIRECT_TEMPLATE_RECIPIENT_EMAIL,
  DIRECT_TEMPLATE_RECIPIENT_NAME,
} from '@documenso/lib/constants/direct-templates';
import { EnvelopeType, type Recipient } from '@prisma/client';
import { nanoid } from 'nanoid';

import { AppError, AppErrorCode } from '../../errors/app-error';
import { type EnvelopeIdOptions, mapSecondaryIdToTemplateId } from '../../utils/envelope';
import { getEnvelopeWhereInput } from '../envelope/get-envelope-by-id';

export type CreateTemplateDirectLinkOptions = {
  id: EnvelopeIdOptions;
  userId: number;
  teamId: number;
  directRecipientId?: number;
};

export const createTemplateDirectLink = async ({
  id,
  userId,
  teamId,
  directRecipientId,
}: CreateTemplateDirectLinkOptions) => {
  const { envelopeWhereInput } = await getEnvelopeWhereInput({
    id,
    type: EnvelopeType.TEMPLATE,
    userId,
    teamId,
  });

  return withDocumentReplacement(envelopeWhereInput, async ({ tx, envelope }) => {
    if (envelope.directLink) {
      throw new AppError(AppErrorCode.ALREADY_EXISTS, { message: 'Direct template already exists' });
    }

    if (directRecipientId && !envelope.recipients.find((recipient) => recipient.id === directRecipientId)) {
      throw new AppError(AppErrorCode.NOT_FOUND, { message: 'Recipient not found' });
    }

    if (
      !directRecipientId &&
      envelope.recipients.find((recipient) => recipient.email.toLowerCase() === DIRECT_TEMPLATE_RECIPIENT_EMAIL)
    ) {
      throw new AppError(AppErrorCode.INVALID_BODY, {
        message: 'Cannot generate placeholder direct recipient',
      });
    }

    const createdDirectLink = await (async () => {
      let recipient: Recipient | undefined;

      if (directRecipientId) {
        recipient = await tx.recipient.update({
          where: {
            envelopeId: envelope.id,
            id: directRecipientId,
          },
          data: {
            ...(await recipientIdentityReset(
              tx,
              envelope.recipients.find((row) => row.id === directRecipientId),
              { name: DIRECT_TEMPLATE_RECIPIENT_NAME, email: DIRECT_TEMPLATE_RECIPIENT_EMAIL },
              envelope.fields,
            )),
            name: DIRECT_TEMPLATE_RECIPIENT_NAME,
            email: DIRECT_TEMPLATE_RECIPIENT_EMAIL,
          },
        });
      } else {
        recipient = await tx.recipient.create({
          data: {
            envelopeId: envelope.id,
            name: DIRECT_TEMPLATE_RECIPIENT_NAME,
            email: DIRECT_TEMPLATE_RECIPIENT_EMAIL,
            token: nanoid(),
          },
        });
      }

      return await tx.templateDirectLink.create({
        data: {
          envelopeId: envelope.id,
          enabled: true,
          token: nanoid(),
          directTemplateRecipientId: recipient.id,
        },
      });
    })();

    return {
      id: createdDirectLink.id,
      token: createdDirectLink.token,
      createdAt: createdDirectLink.createdAt,
      enabled: createdDirectLink.enabled,
      directTemplateRecipientId: createdDirectLink.directTemplateRecipientId,
      templateId: mapSecondaryIdToTemplateId(envelope.secondaryId),
      envelopeId: envelope.id,
    };
  });
};
