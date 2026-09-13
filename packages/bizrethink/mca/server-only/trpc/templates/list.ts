import { authenticatedProcedure } from '@documenso/trpc/server/trpc';
import { listMcaTemplates } from '../../../templates/server-only/service';
import { ZListMcaTemplatesRequestSchema } from './router.types';

export const listMcaTemplateRoute = authenticatedProcedure
  .input(ZListMcaTemplatesRequestSchema)
  .query(async ({ ctx, input }) => {
    return listMcaTemplates({ ...input, userId: ctx.user.id });
  });
