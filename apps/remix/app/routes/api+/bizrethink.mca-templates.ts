import { listMcaTemplatesForApi } from '@bizrethink/customizations/mca/publish/server-only/templates-api';
import type { Route } from './+types/bizrethink.mca-templates';

export const loader = ({ request }: Route.LoaderArgs) => listMcaTemplatesForApi(request);
