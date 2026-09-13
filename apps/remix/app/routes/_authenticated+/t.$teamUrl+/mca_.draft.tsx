import legalStyles from '@bizrethink/customizations/legal-ui/reading.css?url';
import { McaTemplateUseWorkspace } from '@bizrethink/customizations/mca/components/template-use';
import { assertMcaTeamAccess } from '@bizrethink/customizations/mca/templates/server-only/service';
import { getSession } from '@documenso/auth/server/lib/utils/get-session';
import { getTeamByUrl } from '@documenso/lib/server-only/team/get-team';
import { useLoaderData } from 'react-router';
import type { Route } from './+types/mca_.draft';

export const links: Route.LinksFunction = () => [{ rel: 'stylesheet', href: legalStyles }];

export const loader = async ({ request, params }: Route.LoaderArgs) => {
  const { user } = await getSession(request);
  const team = await getTeamByUrl({ userId: user.id, teamUrl: params.teamUrl });
  await assertMcaTeamAccess({ teamId: team.id, userId: user.id });
  return { teamId: team.id, teamUrl: team.url };
};
const McaDraftPage = () => {
  const data = useLoaderData<typeof loader>();
  return <McaTemplateUseWorkspace {...data} />;
};
export default McaDraftPage;
