import { authenticatedProcedure } from '@documenso/trpc/server/trpc';
import { previewMcaTemplate } from '../../../templates/server-only/service';
import { ZPreviewMcaTemplateRequestSchema } from './router.types';

export const previewMcaTemplateRoute = authenticatedProcedure
  .input(ZPreviewMcaTemplateRequestSchema)
  .query(async ({ ctx, input }) => {
    return previewMcaTemplate({ ...input, userId: ctx.user.id });
  });
