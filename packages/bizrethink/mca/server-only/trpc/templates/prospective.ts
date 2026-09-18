import { authenticatedProcedure } from '@documenso/trpc/server/trpc';

import { previewProspectiveMcaTemplate } from '../../../templates/server-only/prospective';
import { ZProspectiveMcaTemplateRequestSchema } from './router.types';

/** What an entity and a document type would produce, before the template exists. */
export const prospectiveMcaTemplateRoute = authenticatedProcedure
  .input(ZProspectiveMcaTemplateRequestSchema)
  .query(async ({ ctx, input }) => {
    return previewProspectiveMcaTemplate({
      teamId: input.teamId,
      entityId: input.entityId,
      instrument: input.instrument,
      userId: ctx.user.id,
    });
  });
