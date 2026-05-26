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
import { autoClaimInvitesOnSignup } from '@bizrethink/customizations/server-only/auto-claim-invites-on-signup';
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
   * Note (overlay 048): auto-claim of pending invites runs for ALL signups
   * regardless of this flag — invite consumption is universal post-signup
   * onboarding, decoupled from the auth mechanism.
   */
  skipPersonalOrganisation?: boolean;
};

/**
 * Should be run after a user is created (email-password signup, Google SSO,
 * Organisation SSO link).
 *
 * MODIFIED for BizRethink (overlay 048): auto-claim pending invites
 * matching the new user's email FIRST (runs universally regardless of
 * options). Personal Org is created only when BOTH gates allow:
 *   1. !options.skipPersonalOrganisation (upstream's SSO suppression)
 *   2. accepted.length === 0 (no invites were consumed)
 *
 * @returns User
 */
export const onCreateUserHook = async (user: User, options: OnCreateUserHookOptions = {}) => {
  const accepted = await autoClaimInvitesOnSignup({
    userId: user.id,
    userEmail: user.email,
  }).catch((err) => {
    // Defensive: if auto-claim itself fails (DB blip, etc), still create
    // Personal Org as the safety net. Better to give the user a blank
    // workspace than no workspace at all.
    console.error('[onCreateUserHook] auto-claim invites failed:', err);
    return [];
  });

  if (!options.skipPersonalOrganisation && accepted.length === 0) {
    await createPersonalOrganisation({ userId: user.id });
  }

  return user;
};
