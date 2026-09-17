import { router } from '@documenso/trpc/server/trpc';
import { mcaTemplateAccessRoute } from './access';
import { createMcaTemplateRoute } from './create';
import { getMcaTemplateRoute } from './get';
import { listMcaTemplateRoute } from './list';
import { previewMcaTemplateRoute } from './preview';
import { setMcaAccessRoute } from './set-access';
import { updateMcaTemplateRoute } from './update';

export const mcaTemplatesRouter = router({
  access: mcaTemplateAccessRoute,
  create: createMcaTemplateRoute,
  get: getMcaTemplateRoute,
  list: listMcaTemplateRoute,
  preview: previewMcaTemplateRoute,
  update: updateMcaTemplateRoute,
  setAccess: setMcaAccessRoute,
});
