import { downloadMcaDraftPdf } from '@bizrethink/customizations/mca/transactions/server-only/download';
import type { Route } from './+types/bizrethink.mca-draft';

export const action = ({ request }: Route.ActionArgs) => downloadMcaDraftPdf(request);
