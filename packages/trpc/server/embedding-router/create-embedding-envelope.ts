import { authorizePresignOperation } from '@bizrethink/customizations/server-only/presign-capability';
import { presignProcedure } from '@bizrethink/customizations/server-only/presign-procedure';

import { createEnvelopeRouteCaller } from '../envelope-router/create-envelope';
import {
  ZCreateEmbeddingEnvelopeRequestSchema,
  ZCreateEmbeddingEnvelopeResponseSchema,
} from './create-embedding-envelope.types';

export const createEmbeddingEnvelopeRoute = presignProcedure
  .input(ZCreateEmbeddingEnvelopeRequestSchema)
  .output(ZCreateEmbeddingEnvelopeResponseSchema)
  .mutation(async ({ input, ctx }) => {
    // MODIFIED for BizRethink (overlay 078): a resource-restricted pass cannot create another resource.
    const apiToken = await authorizePresignOperation(ctx.presignCapability, { operation: 'create' });

    const { userId, teamId } = apiToken;

    return await createEnvelopeRouteCaller({
      userId,
      teamId,
      input,
      options: {
        // Default recipients should be added on the frontend automatically for embeds.
        bypassDefaultRecipients: true,
      },
      apiRequestMetadata: ctx.metadata,
      logger: ctx.logger,
    });
  });
