import { authorizePresignOperation } from '@bizrethink/customizations/server-only/presign-capability';
import { presignProcedure } from '@bizrethink/customizations/server-only/presign-procedure';
import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { updateEnvelope } from '@documenso/lib/server-only/envelope/update-envelope';
import { setFieldsForTemplate } from '@documenso/lib/server-only/field/set-fields-for-template';
import { setTemplateRecipients } from '@documenso/lib/server-only/recipient/set-template-recipients';

import {
  ZUpdateEmbeddingTemplateRequestSchema,
  ZUpdateEmbeddingTemplateResponseSchema,
} from './update-embedding-template.types';

export const updateEmbeddingTemplateRoute = presignProcedure
  .input(ZUpdateEmbeddingTemplateRequestSchema)
  .output(ZUpdateEmbeddingTemplateResponseSchema)
  .mutation(async ({ input, ctx }) => {
    ctx.logger.info({
      input: {
        templateId: input.templateId,
      },
    });

    try {
      // MODIFIED for BizRethink (overlay 078): enforce the parent team before any target mutation.
      const apiToken = await authorizePresignOperation(ctx.presignCapability, {
        operation: 'update',
        scope: `templateId:${input.templateId}`,
      });

      const { templateId, title, externalId, recipients, meta } = input;

      await updateEnvelope({
        id: {
          type: 'templateId',
          id: templateId,
        },
        userId: apiToken.userId,
        teamId: apiToken.teamId,
        data: {
          title,
          externalId,
        },
        meta,
        requestMetadata: ctx.metadata,
      });

      const { recipients: updatedRecipients } = await setTemplateRecipients({
        userId: apiToken.userId,
        teamId: apiToken.teamId ?? undefined,
        id: {
          type: 'templateId',
          id: templateId,
        },
        recipients: recipients.map((recipient) => ({
          id: recipient.id,
          email: recipient.email,
          name: recipient.name ?? '',
          role: recipient.role ?? 'SIGNER',
          signingOrder: recipient.signingOrder,
        })),
      });

      const fields = recipients.flatMap((recipient) => {
        const recipientId = updatedRecipients.find((r) => r.id === recipient.id)?.id;

        if (!recipientId) {
          throw new AppError(AppErrorCode.UNKNOWN_ERROR, {
            message: 'Recipient not found',
          });
        }

        return (recipient.fields ?? []).map((field) => ({
          ...field,
          recipientId,
        }));
      });

      await setFieldsForTemplate({
        userId: apiToken.userId,
        teamId: apiToken.teamId ?? undefined,
        id: {
          type: 'templateId',
          id: templateId,
        },
        fields: fields.map((field) => ({
          ...field,
          pageWidth: field.width,
          pageHeight: field.height,
        })),
      });

      return {
        templateId,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(AppErrorCode.UNKNOWN_ERROR, {
        message: 'Failed to update template',
      });
    }
  });
