import { authClient } from '@documenso/auth/client';
import { getOptionalSession } from '@documenso/auth/server/lib/utils/get-session';
import {
  // MODIFIED for BizRethink (overlay 014): async DB-backed getters for the SSO
  // flags + OIDC label, so the admin UI can toggle providers without a redeploy.
  getOidcProviderLabel,
  IS_OIDC_AUTO_REDIRECT_DISABLED,
  isGoogleSsoEnabled,
  isMicrosoftSsoEnabled,
  isOidcSsoEnabled,
  isSigninEnabledForProvider,
  isSignupEnabledForProvider,
} from '@documenso/lib/constants/auth';
import { isValidReturnTo, normalizeReturnTo } from '@documenso/lib/utils/is-valid-return-to';
import { Alert, AlertDescription } from '@documenso/ui/primitives/alert';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';
import { Loader2Icon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, redirect, useSearchParams } from 'react-router';

import { SignInForm } from '~/components/forms/signin';
import { SIGNUP_ERROR_MESSAGES } from '~/components/forms/signup';
import { appMetaTags } from '~/utils/meta';

import type { Route } from './+types/signin';

export function meta() {
  return appMetaTags(msg`Sign In`);
}

export async function loader({ request }: Route.LoaderArgs) {
  const { isAuthenticated } = await getOptionalSession(request);

  // SSR env variables.
  const isEmailPasswordSigninEnabled = isSigninEnabledForProvider('email');

  // MODIFIED for BizRethink (overlay 014 + captcha config): the raw SSO flags and
  // the Turnstile site key come from the DB-backed admin config. Upstream's
  // per-provider signin gating is preserved by ANDing it on top.
  const [googleSso, microsoftSso, oidcSso, oidcProviderLabel, turnstileSiteKey] = await Promise.all([
    isGoogleSsoEnabled(),
    isMicrosoftSsoEnabled(),
    isOidcSsoEnabled(),
    getOidcProviderLabel(),
    import('@bizrethink/customizations/server-only/captcha-config').then(async (m) => m.getTurnstileSiteKey()),
  ]);

  const isGoogleSSOEnabled = googleSso && isSigninEnabledForProvider('google');
  const isMicrosoftSSOEnabled = microsoftSso && isSigninEnabledForProvider('microsoft');
  const isOIDCSSOEnabled = oidcSso && isSigninEnabledForProvider('oidc');

  // Automatically redirect to OIDC when it is the only enabled signin transport,
  // unless the redirect has been explicitly disabled via env.
  const isOIDCOnlyTransport =
    isOIDCSSOEnabled && !isEmailPasswordSigninEnabled && !isGoogleSSOEnabled && !isMicrosoftSSOEnabled;

  const shouldAutoRedirectToOIDC = isOIDCOnlyTransport && !IS_OIDC_AUTO_REDIRECT_DISABLED;

  const isSignupEnabled =
    isSignupEnabledForProvider('email') ||
    (googleSso && isSignupEnabledForProvider('google')) ||
    (microsoftSso && isSignupEnabledForProvider('microsoft')) ||
    (oidcSso && isSignupEnabledForProvider('oidc'));

  // MODIFIED for BizRethink (overlay 012): signup-disabled is a DB-backed admin
  // toggle. It runs independently of upstream's env-driven provider gating —
  // either one disabling signup hides the CTA.
  const { isSignupDisabled: getIsSignupDisabled } = await import(
    '@bizrethink/customizations/server-only/signup-config'
  );

  const isSignupDisabled = await getIsSignupDisabled();

  let returnTo = new URL(request.url).searchParams.get('returnTo') ?? undefined;

  returnTo = isValidReturnTo(returnTo) ? normalizeReturnTo(returnTo) : undefined;

  if (isAuthenticated) {
    throw redirect(returnTo || '/');
  }

  return {
    isEmailPasswordSigninEnabled,
    isGoogleSSOEnabled,
    isMicrosoftSSOEnabled,
    isOIDCSSOEnabled,
    isSignupDisabled,
    isSignupEnabled,
    oidcProviderLabel,
    returnTo,
    shouldAutoRedirectToOIDC,
    turnstileSiteKey,
  };
}

export default function SignIn({ loaderData }: Route.ComponentProps) {
  const {
    isEmailPasswordSigninEnabled,
    isGoogleSSOEnabled,
    isMicrosoftSSOEnabled,
    isOIDCSSOEnabled,
    isSignupDisabled,
    isSignupEnabled,
    oidcProviderLabel,
    returnTo,
    shouldAutoRedirectToOIDC,
    turnstileSiteKey,
  } = loaderData;

  const { _ } = useLingui();

  const [searchParams] = useSearchParams();
  const [isEmbeddedRedirect, setIsEmbeddedRedirect] = useState(false);

  const errorParam = searchParams.get('error');
  const signupError = errorParam ? SIGNUP_ERROR_MESSAGES[errorParam] : undefined;

  useEffect(() => {
    const hash = window.location.hash.slice(1);

    const params = new URLSearchParams(hash);

    setIsEmbeddedRedirect(params.get('embedded') === 'true');
  }, []);

  useEffect(() => {
    if (!shouldAutoRedirectToOIDC) {
      return;
    }

    void authClient.oidc.signIn({ redirectPath: returnTo ?? '/' });
  }, [shouldAutoRedirectToOIDC, returnTo]);

  if (shouldAutoRedirectToOIDC) {
    return (
      <div className="w-screen max-w-lg px-4">
        <div className="flex flex-col items-center justify-center gap-y-4 py-12">
          <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground text-sm">
            <Trans>Redirecting to {oidcProviderLabel || 'OIDC'}...</Trans>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen max-w-lg px-4">
      <div className="z-10 rounded-xl border border-border bg-neutral-100 p-6 dark:bg-background">
        {signupError && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{_(signupError)}</AlertDescription>
          </Alert>
        )}

        <h1 className="font-semibold text-2xl">
          <Trans>Sign in to your account</Trans>
        </h1>

        <p className="mt-2 text-muted-foreground text-sm">
          <Trans>Welcome back, we are lucky to have you.</Trans>
        </p>
        <hr className="-mx-6 my-4" />

        <SignInForm
          isEmailPasswordSigninEnabled={isEmailPasswordSigninEnabled}
          isGoogleSSOEnabled={isGoogleSSOEnabled}
          isMicrosoftSSOEnabled={isMicrosoftSSOEnabled}
          isOIDCSSOEnabled={isOIDCSSOEnabled}
          oidcProviderLabel={oidcProviderLabel}
          returnTo={returnTo}
          turnstileSiteKey={turnstileSiteKey}
        />

        {!isEmbeddedRedirect && isSignupEnabled && !isSignupDisabled && (
          <p className="mt-6 text-center text-muted-foreground text-sm">
            <Trans>
              Don't have an account?{' '}
              <Link
                to={returnTo ? `/signup?returnTo=${encodeURIComponent(returnTo)}` : '/signup'}
                className="text-documenso-700 duration-200 hover:opacity-70"
              >
                Sign up
              </Link>
            </Trans>
          </p>
        )}
      </div>
    </div>
  );
}
