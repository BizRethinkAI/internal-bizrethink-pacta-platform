import { TEAM_DOCUMENT_VISIBILITY_MAP } from '@documenso/lib/constants/teams';
import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { getEnvelopeWhereInput } from '@documenso/lib/server-only/envelope/get-envelope-by-id';
import { getTeamById } from '@documenso/lib/server-only/team/get-team';
import { buildTeamWhereQuery } from '@documenso/lib/utils/teams';
import { prisma } from '@documenso/prisma';
import { EnvelopeType, type Prisma, TeamMemberRole, TemplateType } from '@prisma/client';
import type { MiddlewareHandler } from 'hono';

import { getApiTokenEnvelopeScope } from './api-token-team-scope';

/** Suggestions inherit the document reader's ownership/role/team-email policy,
 * with the selected team outside every branch. Membership is verified before
 * either directory read and retained in both data queries. */
export const getRecipientSuggestionWhere = async (
  userId: number,
  teamId: number,
): Promise<Prisma.EnvelopeWhereInput> => {
  const team = await getTeamById({ userId, teamId });
  const allowed: Prisma.EnvelopeWhereInput[] = [
    { userId },
    { visibility: { in: TEAM_DOCUMENT_VISIBILITY_MAP[team.currentTeamRole] } },
  ];
  if (team.teamEmail) {
    allowed.push({ user: { email: team.teamEmail.email } });
  }
  return { type: EnvelopeType.DOCUMENT, team: buildTeamWhereQuery({ userId, teamId }), OR: allowed };
};

type FilePermissionOptions = {
  userId: number;
  envelopeId: string;
  /** Already verified delegated authority; this predicate can only narrow access. */
  scope?: Prisma.EnvelopeWhereInput;
};

/** Return a permission predicate for the SAME query that loads PDF data.
 * The preliminary lookup reads only the target's team, never file data. */
export const getEnvelopeFileWhereInput = async ({
  userId,
  envelopeId,
  scope = {},
}: FilePermissionOptions): Promise<Prisma.EnvelopeWhereInput> => {
  const unavailable: Prisma.EnvelopeWhereInput = { id: { in: [] } };
  const binding = await prisma.envelope.findFirst({
    where: { AND: [{ id: envelopeId }, scope] },
    select: { teamId: true },
  });
  if (!binding) {
    return unavailable;
  }
  let apiScope: { teamId?: number };
  try {
    apiScope = getApiTokenEnvelopeScope(binding.teamId);
  } catch (error) {
    if (error instanceof AppError && error.code === AppErrorCode.NOT_FOUND) {
      return unavailable;
    }
    throw error;
  }

  const allowed: Prisma.EnvelopeWhereInput[] = [];
  try {
    const { envelopeWhereInput } = await getEnvelopeWhereInput({
      id: { type: 'envelopeId', id: envelopeId },
      userId,
      teamId: binding.teamId,
      type: null,
    });
    // The role was obtained for this team, so a concurrently moved envelope
    // cannot borrow that role. Retain all existing owner/team-email branches.
    allowed.push({ AND: [envelopeWhereInput, { teamId: binding.teamId }] });
  } catch (error) {
    if (!(error instanceof AppError) || error.code !== AppErrorCode.NOT_FOUND) {
      throw error;
    }
  }

  // File URLs do not carry a selected team. An organisation template is shared
  // when at least one current team in that organisation grants its visibility.
  // A private template or a document can never take this branch.
  allowed.push({
    type: EnvelopeType.TEMPLATE,
    templateType: TemplateType.ORGANISATION,
    OR: Object.values(TeamMemberRole).map((role) => ({
      visibility: { in: TEAM_DOCUMENT_VISIBILITY_MAP[role] },
      team: {
        organisation: { teams: { some: buildTeamWhereQuery({ teamId: undefined, userId, roles: [role] }) } },
      },
    })),
  });
  return { AND: [{ id: envelopeId }, apiScope, scope, { OR: allowed }] };
};

/** A browser or shared cache must not outlive a subsequent role/visibility change. */
export const privateEnvelopeFileCache: MiddlewareHandler = async (c, next) => {
  c.header('Cache-Control', 'private, no-store, max-age=0');
  try {
    await next();
  } finally {
    c.header('Cache-Control', 'private, no-store, max-age=0');
  }
};

export const documentUnavailable = () => new AppError(AppErrorCode.NOT_FOUND, { message: 'Document not found' });
