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

/**
 * True if signup is disabled instance-wide. Fails closed: only an enabled,
 * valid site.signup row with signupDisabled=false opens it, and
 * `NEXT_PUBLIC_DISABLE_SIGNUP === 'true'` closes it regardless.
 */
export const isSignupDisabled = async (): Promise<boolean> => {
  const dbConfig = await readDbConfig();
  if (!dbConfig) {
    return true;
  }
  if (env('NEXT_PUBLIC_DISABLE_SIGNUP') === 'true') {
    return true;
  }
  return dbConfig.signupDisabled;
};

/**
 * True if signup requires a pending OrganisationMemberInvite to succeed.
 * Only meaningful when allowedSignupDomains is non-empty (domain-gated
 * mode) — when no domain gating exists, this returns false even if the
 * setting is on (we don't want to surprise-block self-host single-user
 * deployments). Phase L (2026-05-11): closes the "domain matches but no
 * invite" hole.
 */
export const isInviteRequiredForSignup = async (): Promise<boolean> => {
  const dbConfig = await readDbConfig();
  if (!dbConfig) {
    return false;
  }
  return dbConfig.requireInviteWhenDomainGated && dbConfig.allowedDomains.length > 0;
};

/**
 * List of email domains permitted to sign up. Empty array means all
 * domains allowed. DB takes precedence; `NEXT_PRIVATE_ALLOWED_SIGNUP_DOMAINS`
 * (CSV) is the env fallback.
 */
export const getAllowedSignupDomains = async (): Promise<string[]> => {
  const dbConfig = await readDbConfig();
  if (dbConfig && dbConfig.allowedDomains.length > 0) {
    return dbConfig.allowedDomains;
  }

  const envDomains = env('NEXT_PRIVATE_ALLOWED_SIGNUP_DOMAINS');
  if (!envDomains) {
    return [];
  }

  return envDomains
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean);
};
