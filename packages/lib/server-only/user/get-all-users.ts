import { EnvelopeType, Prisma } from '@prisma/client';

// MODIFIED for BizRethink (overlay 053): exclude system service accounts from
// the admin users list. `deleted-account@<host>` (orphan-envelope receiver)
// and `serviceaccount@<host>` (legacy service account) are load-bearing
// Documenso plumbing — they show up in /admin/users as real rows but
// shouldn't be presented as users an admin might want to edit/delete. See
// memory/system_service_accounts.md for the full reasoning. We exclude
// rather than label-with-badge so the table stays a clean list of actual
// people; if we want to render them later, swap to a query option.
import { deletedServiceAccountEmail } from '@documenso/lib/server-only/user/service-accounts/deleted-account';
import { legacyServiceAccountEmail } from '@documenso/lib/server-only/user/service-accounts/legacy-service-account';
import { prisma } from '@documenso/prisma';

type GetAllUsersProps = {
  username: string;
  email: string;
  page: number;
  perPage: number;
};

export const findUsers = async ({
  username = '',
  email = '',
  page = 1,
  perPage = 10,
}: GetAllUsersProps) => {
  const whereClause = Prisma.validator<Prisma.UserWhereInput>()({
    AND: [
      {
        OR: [
          {
            name: {
              contains: username,
              mode: 'insensitive',
            },
          },
          {
            email: {
              contains: email,
              mode: 'insensitive',
            },
          },
        ],
      },
      {
        // BizRethink overlay 053: filter out the two system service accounts.
        email: {
          notIn: [deletedServiceAccountEmail(), legacyServiceAccountEmail()],
        },
      },
    ],
  });

  const [users, count] = await Promise.all([
    prisma.user.findMany({
      select: {
        _count: {
          select: {
            envelopes: {
              where: {
                type: EnvelopeType.DOCUMENT,
              },
            },
          },
        },
        id: true,
        name: true,
        email: true,
        roles: true,
      },
      where: whereClause,
      skip: Math.max(page - 1, 0) * perPage,
      take: perPage,
    }),
    prisma.user.count({
      where: whereClause,
    }),
  ]);

  return {
    users: users.map((user) => ({
      ...user,
      documentCount: user._count.envelopes,
    })),
    totalPages: Math.ceil(count / perPage),
  };
};
