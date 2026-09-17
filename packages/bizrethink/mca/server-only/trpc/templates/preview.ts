import { authenticatedProcedure } from '@documenso/trpc/server/trpc';
import { projectTemplateReading } from '../../../templates/reading';
import { type McaPreviewedTemplate, previewMcaTemplate } from '../../../templates/server-only/service';
import { ZPreviewMcaTemplateRequestSchema } from './router.types';

export const previewMcaTemplateRoute = authenticatedProcedure
  .input(ZPreviewMcaTemplateRequestSchema)
  // The return type is DECLARED. This is a client-facing contract, and every
  // caller of it infers from here; stating it means a change to the compiled
  // snapshot shows up as an error on this line rather than in a component.
  .query(async ({ ctx, input }): Promise<McaPreviewedTemplate> => {
    return projectTemplateReading(await previewMcaTemplate({ ...input, userId: ctx.user.id }));
  });
