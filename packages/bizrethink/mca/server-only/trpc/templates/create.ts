import { authenticatedProcedure } from '@documenso/trpc/server/trpc';
import { createMcaTemplate } from '../../../templates/server-only/service';
import { ZCreateMcaTemplateRequestSchema } from './router.types';

export const createMcaTemplateRoute = authenticatedProcedure
  .input(ZCreateMcaTemplateRequestSchema)
  .mutation(async ({ ctx, input }) => {
    return createMcaTemplate({
      teamId: input.teamId,
      profile: input.data,
      instrument: input.instrument,
      userId: ctx.user.id,
    });
  });
