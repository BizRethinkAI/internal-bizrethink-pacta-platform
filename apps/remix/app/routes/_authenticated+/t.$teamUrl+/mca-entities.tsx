import legalStyles from '@bizrethink/customizations/legal-ui/reading.css?url';
import { McaEntities } from '@bizrethink/customizations/mca/components/entities';
import { assertMcaTeamAccess } from '@bizrethink/customizations/mca/templates/server-only/service';
import { getSession } from '@documenso/auth/server/lib/utils/get-session';
import { getTeamByUrl } from '@documenso/lib/server-only/team/get-team';
import { TeamMemberRole } from '@documenso/prisma/generated/types';
import { useLoaderData } from 'react-router';
import type { Route } from './+types/mca-entities';

export const links: Route.LinksFunction = () => [{ rel: 'stylesheet', href: legalStyles }];

/**
 * The entities that issue MCA documents. ADR 0026.
 *
 * Same gate as the template builder beside it: membership plus the MCA builder
 * grant to read, ADMIN or MANAGER to change anything. Writing is a programme
 * decision, because an entity's terms decide which clauses every document it
 * issues contains (ADR 0016).
 */
export const loader = async ({ request, params }: Route.LoaderArgs) => {
  const { user } = await getSession(request);
  const team = await getTeamByUrl({ userId: user.id, teamUrl: params.teamUrl });

  await assertMcaTeamAccess({ teamId: team.id, userId: user.id });

  return {
    teamId: team.id,
    teamUrl: params.teamUrl,
    canWrite: team.currentTeamRole === TeamMemberRole.ADMIN || team.currentTeamRole === TeamMemberRole.MANAGER,
  };
};

const McaEntitiesPage = () => {
  const data = useLoaderData<typeof loader>();

  return <McaEntities {...data} />;
};

export default McaEntitiesPage;
