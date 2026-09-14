import { authenticatedProcedure } from '@documenso/trpc/server/trpc';
import { projectTemplateReading } from '../../../templates/reading';
import { previewMcaTemplate } from '../../../templates/server-only/service';
import { ZPreviewMcaTemplateRequestSchema } from './router.types';

export const previewMcaTemplateRoute = authenticatedProcedure
  .input(ZPreviewMcaTemplateRequestSchema)
  .query(async ({ ctx, input }) => {
    return projectTemplateReading(await previewMcaTemplate({ ...input, userId: ctx.user.id }));
  });
