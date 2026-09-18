import { router } from '@documenso/trpc/server/trpc';
import { mcaTemplateAccessRoute } from './access';
import { createMcaTemplateRoute } from './create';
import { getMcaTemplateRoute } from './get';
import { listMcaTemplateRoute } from './list';
import { previewMcaTemplateRoute } from './preview';
import { prospectiveMcaTemplateRoute } from './prospective';
import { mcaPublicationStatusRoute, publishMcaTemplateRoute } from './publish';
import { setMcaAccessRoute } from './set-access';
import { updateMcaTemplateRoute } from './update';

export const mcaTemplatesRouter = router({
  access: mcaTemplateAccessRoute,
  create: createMcaTemplateRoute,
  get: getMcaTemplateRoute,
  list: listMcaTemplateRoute,
  preview: previewMcaTemplateRoute,
  prospective: prospectiveMcaTemplateRoute,
  publicationStatus: mcaPublicationStatusRoute,
  publish: publishMcaTemplateRoute,
  update: updateMcaTemplateRoute,
  setAccess: setMcaAccessRoute,
});
