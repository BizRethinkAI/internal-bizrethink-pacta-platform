import { addUserToOrganisation } from '@documenso/lib/server-only/organisation/accept-organisation-invitation';
import { createPersonalOrganisation } from '@documenso/lib/server-only/organisation/create-organisation';
import { prisma } from '@documenso/prisma';
import { OrganisationMemberInviteStatus } from '@prisma/client';

// Phase L (2026-05-11): auto-accept ALL pending OrganisationMemberInvite
// rows that match a newly-signed-up user's email.
//
// Background: Documenso's default signup flow always spawns a "Personal
// Organisation" for the new user and ignores pending invites. In a B2B /
// domain-gated setup (like Pacta for CircularPay) that's wrong — a user
// who was invited by an admin should land in the invited org, not in a
// blank Personal Org they didn't ask for.
//
// This helper runs from the patched `onCreateUserHook` (overlay 048) right
// after the User row is created. Its contract:
//   - finds every PENDING invite where invite.email == user.email (case
//     insensitive)
//   - accepts each by inserting OrganisationMember + OrganisationGroupMember
//     using upstream's `addUserToOrganisation` (which already wraps the
//     correct group-picking logic — INTERNAL_ORGANISATION group of matching
//     role)
//   - flips each invite to ACCEPTED
//   - returns the list of orgs the user just joined (used by the caller to
//     decide whether to skip Personal Org creation)
//
// The caller is responsible for the "skip Personal Org" decision —
// `onCreateUserHook` in `create-user.ts` checks the returned count.
//
// Errors are swallowed per-invite (logged + continue) so one malformed
// invite doesn't block signup completion. The user can always be invited
// again or contact admin.

export type AutoClaimedInvite = {
  organisationId: string;
  organisationName: string;
  organisationRole: 'ADMIN' | 'MANAGER' | 'MEMBER';
  inviteId: string;
};

export const autoClaimInvitesOnSignup = async ({
  userId,
  userEmail,
}: {
  userId: number;
  userEmail: string;
}): Promise<AutoClaimedInvite[]> => {
  const pendingInvites = await prisma.organisationMemberInvite.findMany({
    where: {
      email: {
        equals: userEmail,
        mode: 'insensitive',
      },
      status: OrganisationMemberInviteStatus.PENDING,
    },
    include: {
      organisation: {
        include: {
          groups: true,
        },
      },
    },
  });

  if (pendingInvites.length === 0) {
    return [];
  }

  const accepted: AutoClaimedInvite[] = [];

  for (const invite of pendingInvites) {
    try {
      // bypassEmail=false (default) triggers the
      // `send.organisation-member-joined.email` job. Despite the name,
      // upstream's handler sends this to all org admins/managers (everyone
      // with the MANAGE_ORGANISATION permission) — NOT to the joining user
      // — so this gives us the admin-notification-on-auto-accept feature
      // for free. The joining user gets the unrelated signup-confirmation
      // email from the auth flow.
      await addUserToOrganisation({
        userId,
        organisationId: invite.organisation.id,
        organisationGroups: invite.organisation.groups,
        organisationMemberRole: invite.organisationRole,
      });

      await prisma.organisationMemberInvite.update({
        where: { id: invite.id },
        data: { status: OrganisationMemberInviteStatus.ACCEPTED },
      });

      accepted.push({
        organisationId: invite.organisation.id,
        organisationName: invite.organisation.name,
        organisationRole: invite.organisationRole,
        inviteId: invite.id,
      });
    } catch (err) {
      // Log + continue. We don't want one bad invite to fail the whole
      // signup. The user still gets account created; admin can re-invite.
      console.error(`[auto-claim-invites] Failed to accept invite ${invite.id} for ${userEmail}:`, err);
    }
  }

  return accepted;
};

// Overlay 071 (2026-09-10): a pending invite is claimed only for a VERIFIED
// email. Claiming at signup, before verification, let anyone who typed an
// invited address into the signup form join the inviting org. So:
//   - `onCreateUserHook` claims only when the new user is already verified
//     (SSO), and for an unverified user with a pending invite it defers the
//     Personal Org too (`hasPendingInvites`);
//   - `verifyEmail` calls `claimInvitesOnVerification` once the address is
//     proven, which claims and then backfills the deferred Personal Org if
//     nothing was claimed and the user belongs to no org.

/** True when at least one PENDING invite matches `email` (case-insensitive). */
export const hasPendingInvites = async (email: string): Promise<boolean> => {
  const invite = await prisma.organisationMemberInvite.findFirst({
    where: {
      email: {
        equals: email,
        mode: 'insensitive',
      },
      status: OrganisationMemberInviteStatus.PENDING,
    },
    select: { id: true },
  });

  return invite !== null;
};

/**
 * Runs after `verifyEmail` marks the user VERIFIED. Claims every pending
 * invite for the now-proven address; if none was claimed and the user has no
 * org membership at all, creates the Personal Org that `onCreateUserHook`
 * deferred, so the user is never left without a workspace.
 *
 * Never throws: a failure here must not fail email verification.
 */
export const claimInvitesOnVerification = async ({
  userId,
  email,
}: {
  userId: number;
  email: string;
}): Promise<AutoClaimedInvite[]> => {
  try {
    const accepted = await autoClaimInvitesOnSignup({ userId, userEmail: email });

    if (accepted.length === 0) {
      const memberships = await prisma.organisationMember.count({ where: { userId } });

      if (memberships === 0) {
        await createPersonalOrganisation({ userId });
      }
    }

    return accepted;
  } catch (err) {
    console.error(`[claim-invites-on-verification] Failed for user ${userId}:`, err);
    return [];
  }
};
