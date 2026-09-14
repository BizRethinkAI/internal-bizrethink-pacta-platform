// MODIFIED for BizRethink (overlay 089): bounded resource work and trial/domain policy.
// BizRethink overlay 089: owned trial-policy page with an independent leaf-loader gate.
import { ResourcePolicyPage } from '@bizrethink/customizations/admin/resource-policy-page';
import { requireAdminLoader } from '@bizrethink/customizations/server-only/require-admin-loader';
import type { LoaderFunctionArgs } from 'react-router';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await requireAdminLoader(request);
  return null;
};
export default ResourcePolicyPage;
