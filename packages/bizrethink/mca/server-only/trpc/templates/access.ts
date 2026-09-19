import { buildTeamWhereQuery } from '@documenso/lib/utils/teams';
import { prisma } from '@documenso/prisma';
import { authenticatedProcedure } from '@documenso/trpc/server/trpc';
import { describeTeamGrants } from '../../../../server-only/feature-access';
import { MCA_BUILDER_FEATURE } from '../../../templates/server-only/service';

/**
 * Which of this person's teams hold the MCA builder, and what is holding them.
 *
 * `teams` is the permitted set — what the workspace navigation links to, and
 * what this route has always returned. `grants` is every team the person
 * belongs to, with its attribution, which the admin page needs in order to
 * offer a toggle per team: a route returning only the permitted set left a
 * feature nobody had been granted with nothing to switch on.
 *
 * The rows are read once and resolved by `describeTeamGrants`, which applies
 * the same rule `getFeatureAccess` applies per route. A navigation entry or a
 * toggle that can disagree with the loader it points at is worse than none.
 */
export const mcaTemplateAccessRoute = authenticatedProcedure.query(async ({ ctx }) => {
  const teams = await prisma.team.findMany({
    where: buildTeamWhereQuery({ teamId: undefined, userId: ctx.user.id }),
    select: { id: true, url: true, name: true, organisationId: true },
    orderBy: { name: 'asc' },
  });

  const [userRow, orgRows] = await Promise.all([
    prisma.bizrethinkFeatureAccess.findUnique({
      where: {
        feature_scope_scopeId: {
          feature: MCA_BUILDER_FEATURE,
          scope: 'user',
          scopeId: String(ctx.user.id),
        },
      },
      select: { enabled: true },
    }),
    prisma.bizrethinkFeatureAccess.findMany({
      where: {
        feature: MCA_BUILDER_FEATURE,
        scope: 'organisation',
        scopeId: {
          in: [...new Set(teams.map((team) => team.organisationId))],
        },
      },
      select: { scopeId: true, enabled: true },
    }),
  ]);

  const grants = describeTeamGrants({
    teams,
    userGrant: userRow,
    orgGrants: Object.fromEntries(orgRows.map((row) => [row.scopeId, { enabled: row.enabled }])),
  });

  return {
    teams: grants.filter((grant) => grant.allowed).map((grant) => grant.team),
    grants,
  };
});
