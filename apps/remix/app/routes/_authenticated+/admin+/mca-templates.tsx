import { McaTemplateAdminHub } from '@bizrethink/customizations/mca/components/provider-templates';
import { McaWorkspaceNav } from '@bizrethink/customizations/mca/components/workspace-nav';
import { requireAdminLoader } from '@bizrethink/customizations/server-only/require-admin-loader';
import { prisma } from '@documenso/prisma';
import { useLoaderData } from 'react-router';
import type { Route } from './+types/mca-templates';

export const loader = async ({ request }: Route.LoaderArgs) => {
  const user = await requireAdminLoader(request);
  const rows = await prisma.bizrethinkFeatureAccess.findMany({
    where: { scope: 'user', scopeId: String(user.id), feature: { in: ['mca-builder', 'mca-clause-draft-rendering'] } },
    select: { feature: true, enabled: true },
  });
  return {
    builder: rows.find((row) => row.feature === 'mca-builder')?.enabled ?? false,
    draft: rows.find((row) => row.feature === 'mca-clause-draft-rendering')?.enabled ?? false,
  };
};
const McaTemplatesAdminPage = () => {
  const grants = useLoaderData<typeof loader>();
  return (
    <div className="space-y-6 p-6">
      <McaWorkspaceNav />
      <McaTemplateAdminHub grants={grants} />
    </div>
  );
};
export default McaTemplatesAdminPage;
