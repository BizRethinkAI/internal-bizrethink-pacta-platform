// MODIFIED for BizRethink (overlay 090): redact server diagnostics before transport.
import { createServerConsole } from '@bizrethink/customizations/server-only/logging/server-console';
import { TEAM_MEMBER_ROLE_PERMISSIONS_MAP } from '@documenso/lib/constants/teams';
import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { prisma } from '@documenso/prisma';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

import { buildTeamWhereQuery } from '../../utils/teams';

const serverConsole = createServerConsole('packages/lib/server-only/team/update-team');

export type UpdateTeamOptions = {
  userId: number;
  teamId: number;
  data: {
    name?: string;
    url?: string;
  };
};

export const updateTeam = async ({ userId, teamId, data }: UpdateTeamOptions): Promise<void> => {
  try {
    const foundTeamWithUrl = await prisma.team.findFirst({
      where: {
        url: data.url,
        id: {
          not: teamId,
        },
      },
    });

    const foundOrganisationWithUrl = await prisma.organisation.findFirst({
      where: {
        url: data.url,
      },
    });

    if (foundTeamWithUrl || foundOrganisationWithUrl) {
      throw new AppError(AppErrorCode.ALREADY_EXISTS, {
        message: 'Team URL already exists.',
      });
    }

    await prisma.team.update({
      where: buildTeamWhereQuery({
        teamId,
        userId,
        roles: TEAM_MEMBER_ROLE_PERMISSIONS_MAP['MANAGE_TEAM'],
      }),
      data: {
        url: data.url,
        name: data.name,
      },
    });
  } catch (err) {
    serverConsole.error(err);

    if (!(err instanceof Prisma.PrismaClientKnownRequestError)) {
      throw err;
    }

    const target = z.array(z.string()).safeParse(err.meta?.target);

    if (err.code === 'P2002' && target.success && target.data.includes('url')) {
      throw new AppError(AppErrorCode.ALREADY_EXISTS, {
        message: 'Team URL already exists.',
      });
    }

    throw err;
  }
};
