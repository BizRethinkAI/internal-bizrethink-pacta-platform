import { authenticatedProcedure } from '@documenso/trpc/server/trpc';
import { getMcaTemplate } from '../../../templates/server-only/service';
import { ZGetMcaTemplateRequestSchema } from './router.types';

export const getMcaTemplateRoute = authenticatedProcedure
  .input(ZGetMcaTemplateRequestSchema)
  .query(async ({ ctx, input }) => {
    return getMcaTemplate({ ...input, userId: ctx.user.id });
  });
