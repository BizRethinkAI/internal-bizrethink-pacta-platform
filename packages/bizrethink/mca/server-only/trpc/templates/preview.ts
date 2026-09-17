import { authenticatedProcedure } from '@documenso/trpc/server/trpc';
import { projectTemplateReading } from '../../../templates/reading';
import { type McaPreviewedTemplate, previewMcaTemplate } from '../../../templates/server-only/service';
import { ZPreviewMcaTemplateRequestSchema } from './router.types';

export const previewMcaTemplateRoute = authenticatedProcedure
  .input(ZPreviewMcaTemplateRequestSchema)
  /*
    THE RETURN TYPE IS DECLARED, not inferred.

    Inferred, it degraded across the tRPC boundary: the client-side output type
    silently lost `instrument` while every type on the server side carried it,
    and the only thing that noticed was a component prop two files away. An
    annotation here is what the client actually reads.
  */
  .query(async ({ ctx, input }): Promise<McaPreviewedTemplate> => {
    return projectTemplateReading(await previewMcaTemplate({ ...input, userId: ctx.user.id }));
  });
