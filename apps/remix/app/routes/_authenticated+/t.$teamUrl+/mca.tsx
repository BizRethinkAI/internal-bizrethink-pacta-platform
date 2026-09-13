import { McaProviderTemplates } from '@bizrethink/customizations/mca/components/provider-templates';
import { assertMcaTeamAccess } from '@bizrethink/customizations/mca/templates/server-only/service';
import { getSession } from '@documenso/auth/server/lib/utils/get-session';
import { getTeamByUrl } from '@documenso/lib/server-only/team/get-team';
import { TeamMemberRole } from '@documenso/prisma/generated/types';
import { useLoaderData } from 'react-router';
import type { Route } from './+types/mca';

export const loader = async ({ request, params }: Route.LoaderArgs) => {
  const { user } = await getSession(request);
  const team = await getTeamByUrl({ userId: user.id, teamUrl: params.teamUrl });
  await assertMcaTeamAccess({ teamId: team.id, userId: user.id });
  return {
    teamId: team.id,
    canWrite: team.currentTeamRole === TeamMemberRole.ADMIN || team.currentTeamRole === TeamMemberRole.MANAGER,
  };
};

const McaTemplatesPage = () => {
  const data = useLoaderData<typeof loader>();
  return <McaProviderTemplates {...data} />;
};
export default McaTemplatesPage;
