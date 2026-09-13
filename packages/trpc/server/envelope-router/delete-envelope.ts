import { deleteVisibleEnvelope } from '@bizrethink/customizations/server-only/delete-visible-envelope';

import { ZGenericSuccessResponse } from '../schema';
import { authenticatedProcedure } from '../trpc';
import {
  deleteEnvelopeMeta,
  ZDeleteEnvelopeRequestSchema,
  ZDeleteEnvelopeResponseSchema,
} from './delete-envelope.types';

export const deleteEnvelopeRoute = authenticatedProcedure
  .meta(deleteEnvelopeMeta)
  .input(ZDeleteEnvelopeRequestSchema)
  .output(ZDeleteEnvelopeResponseSchema)
  .mutation(async ({ input, ctx }) => {
    const { teamId } = ctx;
    const { envelopeId } = input;

    ctx.logger.info({
      input: {
        envelopeId,
      },
    });

    // MODIFIED for BizRethink (overlay 084): authorize dispatch and normalize private-object errors.
    await deleteVisibleEnvelope({ envelopeId, user: ctx.user, teamId, requestMetadata: ctx.metadata });

    return ZGenericSuccessResponse;
  });
