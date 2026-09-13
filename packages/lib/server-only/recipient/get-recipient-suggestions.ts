import { getRecipientSuggestionWhere } from '@bizrethink/customizations/server-only/document-permissions';
import { buildTeamWhereQuery } from '@documenso/lib/utils/teams';
import { prisma } from '@documenso/prisma';
import { Prisma } from '@prisma/client';

export type GetRecipientSuggestionsOptions = {
  userId: number;
  teamId: number;
  query: string;
};

export const getRecipientSuggestions = async ({ userId, teamId, query }: GetRecipientSuggestionsOptions) => {
  // MODIFIED for BizRethink (overlay 084): verify membership before either directory read.
  const envelopeWhere = await getRecipientSuggestionWhere(userId, teamId);
  const trimmedQuery = query.trim();

  const nameEmailFilter = trimmedQuery
    ? {
        OR: [
          {
            name: {
              contains: trimmedQuery,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            email: {
              contains: trimmedQuery,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        ],
      }
    : {};

  const recipients = await prisma.recipient.findMany({
    where: {
      envelope: {
        ...envelopeWhere,
      },
      ...nameEmailFilter,
    },
    select: {
      name: true,
      email: true,
      envelope: {
        select: {
          createdAt: true,
        },
      },
    },
    distinct: ['email'],
    orderBy: {
      envelope: {
        createdAt: 'desc',
      },
    },
    take: 5,
  });

  if (teamId) {
    const teamMembers = await prisma.organisationMember.findMany({
      where: {
        user: {
          ...nameEmailFilter,
          NOT: { id: userId },
        },
        organisationGroupMembers: {
          some: {
            group: {
              teamGroups: {
                some: { teamId, team: buildTeamWhereQuery({ teamId, userId }) },
              },
            },
          },
        },
      },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
      take: 5,
    });

    const uniqueTeamMember = teamMembers.find((member) => !recipients.some((r) => r.email === member.user.email));

    if (uniqueTeamMember) {
      const teamMemberSuggestion = {
        email: uniqueTeamMember.user.email,
        name: uniqueTeamMember.user.name,
      };

      const allSuggestions = [...recipients.slice(0, 4), teamMemberSuggestion];

      return allSuggestions;
    }
  }

  return recipients;
};
