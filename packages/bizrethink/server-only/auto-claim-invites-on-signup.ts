import { jobs } from '@documenso/lib/jobs/client';
import { createServerConsole } from '@bizrethink/customizations/server-only/logging/server-console';
import { addUserToOrganisation } from '@documenso/lib/server-only/organisation/accept-organisation-invitation';
import { createPersonalOrganisation } from '@documenso/lib/server-only/organisation/create-organisation';
import { prisma } from '@documenso/prisma';
import { OrganisationMemberInviteStatus } from '@prisma/client';

const serverConsole = createServerConsole('packages/bizrethink/server-only/auto-claim-invites-on-signup');
import { pendingVerifiedOnboarding } from './verified-onboarding-receipt';

export type AutoClaimedInvite = {
  organisationId: string;
  organisationName: string;
  organisationRole: 'ADMIN' | 'MANAGER' | 'MEMBER';
  inviteId: string;
};

/**
 * Current verified identity, membership/group insertion and invite consumption
 * share a transaction. A user-row lock serializes verification/login retries;
 * invite locks prevent accepting a concurrently declined/deleted invitation.
 * Only invitations present when the email was verified belong to this recovery
 * unit. Later invitations retain their normal acceptance flow. Existing
 * memberships are retained without changing their roles.
 */
const reconcileVerifiedOnboarding = async ({
  userId,
  userEmail,
  createFallback,
}: {
  userId: number;
  userEmail: string;
  createFallback: boolean;
}): Promise<AutoClaimedInvite[]> => {
  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user || user.disabled || !user.emailVerified || user.email.toLowerCase() !== userEmail.toLowerCase()) {
      return { accepted: [], joined: [] };
    }

    const receipt = await tx.bizrethinkVerifiedOnboarding.findUnique({ where: { userId } });
    if (receipt?.completedAt) {
      return { accepted: [], joined: [] };
    }

    await tx.$queryRaw`SELECT id FROM "OrganisationMemberInvite"
      WHERE LOWER(email) = LOWER(${user.email}) AND status = 'PENDING' AND "createdAt" <= ${user.emailVerified}
      ORDER BY id FOR UPDATE`;
    const pendingInvites = await tx.organisationMemberInvite.findMany({
      where: {
        email: { equals: user.email, mode: 'insensitive' },
        status: OrganisationMemberInviteStatus.PENDING,
        createdAt: { lte: user.emailVerified },
      },
      include: { organisation: { include: { groups: true } } },
      orderBy: { id: 'asc' },
    });
    const accepted: AutoClaimedInvite[] = [];
    const joined: string[] = [];
    for (const invite of pendingInvites) {
      const existing = await tx.organisationMember.findUnique({
        where: { userId_organisationId: { userId, organisationId: invite.organisationId } },
      });
      if (!existing) {
        await addUserToOrganisation({
          userId,
          organisationId: invite.organisationId,
          organisationGroups: invite.organisation.groups,
          organisationMemberRole: invite.organisationRole,
          transaction: tx,
          bypassEmail: true,
        });
        joined.push(invite.organisationId);
      }
      await tx.organisationMemberInvite.update({
        where: { id: invite.id },
        data: { status: OrganisationMemberInviteStatus.ACCEPTED },
      });
      accepted.push({
        organisationId: invite.organisationId,
        organisationName: invite.organisation.name,
        organisationRole: invite.organisationRole,
        inviteId: invite.id,
      });
    }
    if (createFallback && receipt && (await tx.organisationMember.count({ where: { userId } })) === 0) {
      await createPersonalOrganisation({ userId, transaction: tx, throwErrorOnOrganisationCreationFailure: true });
    }
    // Completion shares the membership transaction. Without a known pending
    // receipt, login repairs only concrete historical invitations; zero
    // memberships alone never authorizes recreating a deleted workspace.
    if (accepted.length > 0 || (receipt && createFallback)) {
      const completedAt = new Date();
      await tx.bizrethinkVerifiedOnboarding.upsert({
        where: { userId },
        create: { userId, completedAt },
        update: { completedAt },
      });
    }
    return { accepted, joined };
  });

  // Delivery is best effort, after commit. Retrying onboarding never inserts a
  // second membership or re-notifies for an already-consumed invitation.
  for (const organisationId of result.joined) {
    await jobs
      .triggerJob({
        name: 'send.organisation-member-joined.email',
        payload: { organisationId, memberUserId: userId },
      })
      .catch(() => serverConsole.error({ event: 'server.error' }));
  }
  return result.accepted;
};

export const autoClaimInvitesOnSignup = (options: { userId: number; userEmail: string }) =>
  reconcileVerifiedOnboarding({ ...options, createFallback: false });

/** True when a pending invite matches, including before the email is verified. */
export const hasPendingInvites = async (email: string): Promise<boolean> => {
  const invite = await prisma.organisationMemberInvite.findFirst({
    where: { email: { equals: email, mode: 'insensitive' }, status: OrganisationMemberInviteStatus.PENDING },
    select: { id: true },
  });
  return invite !== null;
};

/**
 * Verification remains successful if onboarding cannot commit. Re-clicking a
 * valid completed token or a later authenticated login retries the whole unit.
 * A failure never leaves partially accepted invites or a half-created workspace.
 */
export const claimInvitesOnVerification = async ({ userId, email }: { userId: number; email: string }) => {
  try {
    // Normally already written atomically with email proof. A still-valid
    // completed verification link also permits explicit historical recovery.
    // Persist before reconciliation so a failed fallback remains retryable.
    const allowed = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user || user.disabled || !user.emailVerified || user.email.toLowerCase() !== email.toLowerCase()) {
        return false;
      }
      await pendingVerifiedOnboarding(userId, tx);
      return true;
    });
    return allowed ? await reconcileVerifiedOnboarding({ userId, userEmail: email, createFallback: true }) : [];
  } catch {
    serverConsole.error({ event: 'verification.claim-failed' });
    return [];
  }
};

export const recoverOnboardingOnLogin = async (userId: number) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (user) {
      await reconcileVerifiedOnboarding({ userId, userEmail: user.email, createFallback: true });
    }
  } catch {
    serverConsole.error({ event: 'verification.claim-failed' });
  }
};
