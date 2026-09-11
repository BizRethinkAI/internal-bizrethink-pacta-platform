// MODIFIED for BizRethink (overlay 048): auto-claim pending invites on
// signup + skip Personal Org creation when any invite was accepted.
//
// Why: Documenso's default flow always spawns a Personal Organisation for
// every new user, ignoring any pending OrganisationMemberInvite that
// matches their email. In a B2B / domain-gated setup (Pacta for
// CircularPay) the user was invited by an admin — they should land in
// the invited org, not in a blank Personal Org. See helper at
// packages/bizrethink/server-only/auto-claim-invites-on-signup.ts for
// the full reasoning.
// MODIFIED for BizRethink (overlay 071): + hasPendingInvites (claim only a verified email).
import {
  autoClaimInvitesOnSignup,
  hasPendingInvites,
} from '@bizrethink/customizations/server-only/auto-claim-invites-on-signup';
import { prisma } from '@documenso/prisma';
import { hash } from '@node-rs/bcrypt';
import type { User } from '@prisma/client';

import { SALT_ROUNDS } from '../../constants/auth';
import { AppError, AppErrorCode } from '../../errors/app-error';
import { createPersonalOrganisation } from '../organisation/create-organisation';

export interface CreateUserOptions {
  name: string;
  email: string;
  password: string;
  signature?: string | null;
}

export const createUser = async ({ name, email, password, signature }: CreateUserOptions) => {
  const hashedPassword = await hash(password, SALT_ROUNDS);

  const userExists = await prisma.user.findFirst({
    where: {
      email: email.toLowerCase(),
    },
  });

  if (userExists) {
    throw new AppError(AppErrorCode.ALREADY_EXISTS);
  }

  const user = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword, // Todo: (RR7) Drop password.
        signature,
      },
    });

    // Todo: (RR7) Migrate to use this after RR7.
    // await tx.account.create({
    //   data: {
    //     userId: user.id,
    //     type: 'emailPassword', // Todo: (RR7)
    //     provider: 'DOCUMENSO', // Todo: (RR7) Enums
    //     providerAccountId: user.id.toString(),
    //     password: hashedPassword,
    //   },
    // });

    return user;
  });

  // Not used at the moment, uncomment if required.
  await onCreateUserHook(user).catch((err) => {
    // Todo: (RR7) Add logging.
    console.error(err);
  });

  return user;
};

export type OnCreateUserHookOptions = {
  /**
   * When true, do not create a Personal Organisation for the new user.
   * Used by the Organisation SSO signup path where the user is intended to
   * operate inside the SSO organisation rather than a personal space.
   * Defaults to false (preserves Documenso's default).
   *
   * Note (overlay 048, amended by 071): auto-claim of pending invites runs
   * regardless of this flag, but only for a user whose email is already
   * verified. An unverified user's invites are claimed by verifyEmail.
   */
  skipPersonalOrganisation?: boolean;
};

/**
 * Should be run after a user is created (email-password signup, Google SSO,
 * Organisation SSO link).
 *
 * MODIFIED for BizRethink (overlay 048, amended by 071): auto-claim pending
 * invites matching the new user's email FIRST, but only when the email is
 * already verified. Personal Org is created only when ALL gates allow:
 *   1. !options.skipPersonalOrganisation (upstream's SSO suppression)
 *   2. accepted.length === 0 (no invites were consumed)
 *   3. not (unverified AND a pending invite exists) — deferred to verifyEmail
 *
 * @returns User
 */
export const onCreateUserHook = async (user: User, options: OnCreateUserHookOptions = {}) => {
  // MODIFIED for BizRethink (overlay 071): claim invites only for a verified
  // email; an unverified user's claim runs in verifyEmail instead.
  const accepted = user.emailVerified
    ? await autoClaimInvitesOnSignup({
        userId: user.id,
        userEmail: user.email,
      }).catch((err) => {
        // Defensive: if auto-claim itself fails (DB blip, etc), still create
        // Personal Org as the safety net. Better to give the user a blank
        // workspace than no workspace at all.
        console.error('[onCreateUserHook] auto-claim invites failed:', err);
        return [];
      })
    : [];

  // MODIFIED for BizRethink (overlay 071): an unverified user with a pending
  // invite gets no Personal Org yet — claimInvitesOnVerification decides.
  const deferred =
    !user.emailVerified &&
    (await hasPendingInvites(user.email).catch((err) => {
      console.error('[onCreateUserHook] pending-invite check failed:', err);
      return false;
    }));

  if (!options.skipPersonalOrganisation && accepted.length === 0 && !deferred) {
    await createPersonalOrganisation({ userId: user.id });
  }

  return user;
};
