import { downloadMcaTemplatePreview } from '@bizrethink/customizations/mca/publish/server-only/preview-download';
import type { Route } from './+types/bizrethink.mca-template-preview';

export const action = ({ request }: Route.ActionArgs) => downloadMcaTemplatePreview(request);
