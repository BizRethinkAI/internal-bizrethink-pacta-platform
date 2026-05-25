import { z } from 'zod';

import { env } from '../utils/env';
import { NEXT_PUBLIC_WEBAPP_URL } from './app';

export const SALT_ROUNDS = 12;

export const URL_PATTERN = /https?:\/\/|www\./i;

/**
 * Shared name schema that disallows URLs to prevent phishing via email rendering.
 */
export const ZNameSchema = z
  .string()
  .trim()
  .min(3, { message: 'Please enter a valid name.' })
  .refine((value) => !URL_PATTERN.test(value), {
    message: 'Name cannot contain URLs.',
  });

export const IDENTITY_PROVIDER_NAME: Record<string, string> = {
  DOCUMENSO: 'Pacta',
  GOOGLE: 'Google',
  MICROSOFT: 'Microsoft',
  OIDC: 'OIDC',
};

// MODIFIED for BizRethink (overlay 014): converted from sync booleans to
// async getters so the admin UI can enable/disable providers without
// redeploy. The DB row takes precedence; env values are the bootstrap
// fallback for fresh instances.

export const isGoogleSsoEnabled = async (): Promise<boolean> => {
  const { getProviderConfig } = await import('@bizrethink/customizations/server-only/sso-provider-config');
  return (await getProviderConfig('google')).enabled;
};

export const isMicrosoftSsoEnabled = async (): Promise<boolean> => {
  const { getProviderConfig } = await import('@bizrethink/customizations/server-only/sso-provider-config');
  return (await getProviderConfig('microsoft')).enabled;
};

export const isOidcSsoEnabled = async (): Promise<boolean> => {
  const { getProviderConfig } = await import('@bizrethink/customizations/server-only/sso-provider-config');
  return (await getProviderConfig('oidc')).enabled;
};

export const getOidcProviderLabel = async (): Promise<string> => {
  const { getProviderConfig } = await import('@bizrethink/customizations/server-only/sso-provider-config');
  return (await getProviderConfig('oidc')).oidcProviderLabel || 'OIDC';
};

export const USER_SECURITY_AUDIT_LOG_MAP: Record<string, string> = {
  ACCOUNT_SSO_LINK: 'Linked account to SSO',
  ACCOUNT_SSO_UNLINK: 'Unlinked account from SSO',
  ORGANISATION_SSO_LINK: 'Linked account to organisation',
  ORGANISATION_SSO_UNLINK: 'Unlinked account from organisation',
  ACCOUNT_PROFILE_UPDATE: 'Profile updated',
  AUTH_2FA_DISABLE: '2FA Disabled',
  AUTH_2FA_ENABLE: '2FA Enabled',
  PASSKEY_CREATED: 'Passkey created',
  PASSKEY_DELETED: 'Passkey deleted',
  PASSKEY_UPDATED: 'Passkey updated',
  PASSWORD_RESET: 'Password reset',
  PASSWORD_UPDATE: 'Password updated',
  SESSION_REVOKED: 'Session revoked',
  SIGN_OUT: 'Signed Out',
  SIGN_IN: 'Signed In',
  SIGN_IN_FAIL: 'Sign in attempt failed',
  SIGN_IN_PASSKEY_FAIL: 'Passkey sign in failed',
  SIGN_IN_2FA_FAIL: 'Sign in 2FA attempt failed',
};

/**
 * The duration to wait for a passkey to be verified in MS.
 */
export const PASSKEY_TIMEOUT = 60000;

/**
 * The maximum number of passkeys are user can have.
 */
export const MAXIMUM_PASSKEYS = 50;

export const useSecureCookies =
  env('NODE_ENV') === 'production' && String(NEXT_PUBLIC_WEBAPP_URL()).startsWith('https://');

const secureCookiePrefix = useSecureCookies ? '__Secure-' : '';

export const formatSecureCookieName = (name: string) => `${secureCookiePrefix}${name}`;

export const getCookieDomain = () => {
  const url = new URL(NEXT_PUBLIC_WEBAPP_URL());

  return url.hostname;
};

/**
 * Get allowed signup domains. DB-backed `site.signup.allowedDomains` takes
 * precedence; `NEXT_PRIVATE_ALLOWED_SIGNUP_DOMAINS` (CSV) is the fallback.
 *
 * MODIFIED for BizRethink (overlay 012): converted from sync to async so
 * the admin UI can update the list without redeploy. The DB lookup is
 * dynamic-imported to break the circular dep between constants and
 * @bizrethink/customizations.
 */
export const getAllowedSignupDomains = async (): Promise<string[]> => {
  const { getAllowedSignupDomains: dbGetter } = await import('@bizrethink/customizations/server-only/signup-config');
  return (await dbGetter()).map((d) => d.toLowerCase());
};

/**
 * Check if email domain is allowed for signup.
 * Returns true if no domain restriction is configured.
 *
 * MODIFIED for BizRethink (overlay 012): now async to use the DB-aware getter.
 */
export const isEmailDomainAllowedForSignup = async (email: string): Promise<boolean> => {
  const allowedDomains = await getAllowedSignupDomains();

  if (allowedDomains.length === 0) {
    return true;
  }

  const emailDomain = email.toLowerCase().split('@').pop();

  if (!emailDomain) {
    return false;
  }

  return allowedDomains.includes(emailDomain);
};

/**
 * Adopted from upstream 2026-05-25 merge: env-driven per-provider signup gating.
 * Returns false if NEXT_PUBLIC_DISABLE_SIGNUP=true OR the per-provider env flag
 * is set. Separate from `isSignupDisabled()` (overlay 028, DB-aware) — this is
 * the upstream sync-env path used by auth/handle-oauth-* and the email-password
 * signup route. Both gates run independently.
 */
export const isSignupEnabledForProvider = (provider: 'email' | 'google' | 'microsoft' | 'oidc'): boolean => {
  if (env('NEXT_PUBLIC_DISABLE_SIGNUP') === 'true') {
    return false;
  }

  const flagMap = {
    email: 'NEXT_PUBLIC_DISABLE_EMAIL_PASSWORD_SIGNUP',
    google: 'NEXT_PUBLIC_DISABLE_GOOGLE_SIGNUP',
    microsoft: 'NEXT_PUBLIC_DISABLE_MICROSOFT_SIGNUP',
    oidc: 'NEXT_PUBLIC_DISABLE_OIDC_SIGNUP',
  } as const;

  return env(flagMap[provider]) !== 'true';
};
