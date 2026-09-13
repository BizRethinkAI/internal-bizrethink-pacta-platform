import { authenticatedProcedure } from '@documenso/trpc/server/trpc';
import { reviseMcaTemplate } from '../../../templates/server-only/service';
import { ZUpdateMcaTemplateRequestSchema } from './router.types';

export const updateMcaTemplateRoute = authenticatedProcedure
  .input(ZUpdateMcaTemplateRequestSchema)
  .mutation(async ({ ctx, input }) => {
    return reviseMcaTemplate({ teamId: input.teamId, id: input.id, ...input.data, userId: ctx.user.id });
  });
