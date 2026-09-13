import { buildTeamWhereQuery } from '@documenso/lib/utils/teams';
import { prisma } from '@documenso/prisma';
import { authenticatedProcedure } from '@documenso/trpc/server/trpc';
import { getFeatureAccess } from '../../../../server-only/feature-access';
import { MCA_BUILDER_FEATURE } from '../../../templates/server-only/service';

export const mcaTemplateAccessRoute = authenticatedProcedure.query(async ({ ctx }) => {
  const teams = await prisma.team.findMany({
    where: buildTeamWhereQuery({ teamId: undefined, userId: ctx.user.id }),
    select: { id: true, url: true, name: true, organisationId: true },
  });
  const visible = await Promise.all(
    teams.map(async (team) => {
      const allowed = await getFeatureAccess({
        feature: MCA_BUILDER_FEATURE,
        userId: ctx.user.id,
        organisationId: team.organisationId,
      });
      return allowed ? { id: team.id, url: team.url, name: team.name } : null;
    }),
  );
  return { teams: visible.filter((team) => team !== null) };
});
