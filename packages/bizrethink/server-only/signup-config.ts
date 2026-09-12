import { AuthenticationErrorCode } from '@documenso/auth/server/lib/errors/error-codes';
import { AppError } from '@documenso/lib/errors/app-error';
import { env } from '@documenso/lib/utils/env';
import { prisma } from '@documenso/prisma';

import { ZSiteSettingsSignupSchema } from './site-settings/schemas/signup';

// Phase D (overlay 012): DB-aware getters for signup-related settings.
//
// Replace direct env reads in upstream signup/signin/complete loaders.
//
// FAIL-CLOSED (2026-09-10 incident): signup is open ONLY when the
// id="site.signup" row exists, is enabled, parses, and explicitly says
// signupDisabled=false. A missing row, a disabled row, an unparseable row and
// a DB error all mean CLOSED. The previous design fell back to
// NEXT_PUBLIC_DISABLE_SIGNUP in every one of those cases; prod never set it,
// so signup sat open from launch until an external attacker used it.
// The env var can still close an open row; it can never open a closed one.

const readDbConfig = async () => {
  let row;
  try {
    row = await prisma.siteSettings.findFirst({
      where: { id: 'site.signup' },
    });
  } catch (err) {
    console.warn(
      '[bizrethink/signup-config] DB read failed; treating signup as closed:',
      err instanceof Error ? err.message : err,
    );
    return null;
  }

  if (!row || !row.enabled) {
    return null;
  }

  const parsed = ZSiteSettingsSignupSchema.safeParse(row);
  if (!parsed.success) {
    console.warn(
      '[bizrethink/signup-config] site.signup row does not parse; treating signup as closed:',
      parsed.error.message,
    );
    return null;
  }

  return parsed.data.data;
};

export type SignupPolicy =
  | Readonly<{ signupDisabled: true }>
  | Readonly<{
      signupDisabled: false;
      allowedDomains: readonly string[];
      requiresInvite: boolean;
    }>;

/**
 * Read once per signup request, then retain this policy through every gate.
 * No cross-request cache: the next request observes the next admin change.
 * A closed/unavailable policy exposes no domain or invitation permissions.
 */
export const getSignupPolicy = async (): Promise<SignupPolicy> => {
  const dbConfig = await readDbConfig();
  if (!dbConfig || dbConfig.signupDisabled || env('NEXT_PUBLIC_DISABLE_SIGNUP') === 'true') {
    return { signupDisabled: true };
  }

  // Preserve env bootstrap only after a valid DB policy explicitly opens
  // signup. A failed read can never replace restrictions with an empty list.
  const allowedDomains =
    dbConfig.allowedDomains.length > 0
      ? dbConfig.allowedDomains
      : (env('NEXT_PRIVATE_ALLOWED_SIGNUP_DOMAINS') ?? '')
          .split(',')
          .map((domain) => domain.trim())
          .filter(Boolean);

  return {
    signupDisabled: false,
    allowedDomains: allowedDomains.map((domain) => domain.toLowerCase()),
    // Existing semantics: the invitation toggle applies to the DB allowlist.
    requiresInvite: dbConfig.requireInviteWhenDomainGated && dbConfig.allowedDomains.length > 0,
  };
};

/**
 * Evaluate the supplied policy without a second DB lookup. A closed policy
 * never means "all domains allowed".
 */
export const isEmailDomainAllowedForSignup = (email: string, policy: SignupPolicy): boolean => {
  if (policy.signupDisabled) {
    return false;
  }
  if (policy.allowedDomains.length === 0) {
    return true;
  }
  const emailDomain = email.toLowerCase().split('@').pop();
  return Boolean(emailDomain && policy.allowedDomains.includes(emailDomain));
};

/** Safe for loaders that only need to know whether signup is open. */
export const isSignupDisabled = async (): Promise<boolean> => (await getSignupPolicy()).signupDisabled;

const getOpenSignupPolicy = async () => {
  const policy = await getSignupPolicy();
  if (policy.signupDisabled) {
    throw new AppError(AuthenticationErrorCode.SignupDisabled, { statusCode: 400 });
  }
  return policy;
};

// Compatibility getters for individual callers. Closed/unavailable policy
// rejects instead of silently returning a permissive value. Multi-gate signup
// handlers must use getSignupPolicy once, not call these independently.
export const isInviteRequiredForSignup = async (): Promise<boolean> => (await getOpenSignupPolicy()).requiresInvite;

export const getAllowedSignupDomains = async (): Promise<string[]> => {
  return [...(await getOpenSignupPolicy()).allowedDomains];
};
