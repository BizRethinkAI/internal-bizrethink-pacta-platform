import { useEffect, useRef, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import type { MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';
import type { TurnstileInstance } from '@marsidev/react-turnstile';
import { Turnstile } from '@marsidev/react-turnstile';
import { useForm } from 'react-hook-form';
import { FaIdCardClip } from 'react-icons/fa6';
import { FcGoogle } from 'react-icons/fc';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { z } from 'zod';

import communityCardsImage from '@documenso/assets/images/community-cards.png';
import { authClient } from '@documenso/auth/client';
import { useAnalytics } from '@documenso/lib/client-only/hooks/use-analytics';
import { ZNameSchema } from '@documenso/lib/constants/auth';
import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { env } from '@documenso/lib/utils/env';
import { zEmail } from '@documenso/lib/utils/zod';
// MODIFIED for BizRethink (overlay 048c): pending-invite preview at signup
// form. Calls trpc.bizrethink.signupInvite.lookup with the entered email
// (debounced) and renders "You'll join: <orgName> as <role>" so the user
// knows they're landing in the invited team's org, not a Personal Org.
import { trpc } from '@documenso/trpc/react';
import { ZPasswordSchema } from '@documenso/trpc/server/auth-router/schema';
import { cn } from '@documenso/ui/lib/utils';
import { Button } from '@documenso/ui/primitives/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@documenso/ui/primitives/form/form';
import { Input } from '@documenso/ui/primitives/input';
import { PasswordInput } from '@documenso/ui/primitives/password-input';
import { SignaturePadDialog } from '@documenso/ui/primitives/signature-pad/signature-pad-dialog';
import { useToast } from '@documenso/ui/primitives/use-toast';

// MODIFIED for BizRethink (overlay 054): use Pacta-branded hero component
// instead of upstream's Timur (Documenso founder) demo profile.
import { UserProfilePacta } from '~/components/general/user-profile-pacta';

export const ZSignUpFormSchema = z
  .object({
    name: ZNameSchema,
    email: zEmail().min(1),
    password: ZPasswordSchema,
    signature: z.string().min(1, { message: msg`We need your signature to sign documents`.id }),
  })
  .refine(
    (data) => {
      const { name, email, password } = data;
      return !password.includes(name) && !password.includes(email.split('@')[0]);
    },
    {
      message: msg`Password should not be common or based on personal information`.id,
      path: ['password'],
    },
  );

export const SIGNUP_ERROR_MESSAGES: Record<string, MessageDescriptor> = {
  SIGNUP_DISABLED: msg`Signup is currently disabled or not available for your email domain.`,
  [AppErrorCode.ALREADY_EXISTS]: msg`We were unable to create your account. If you already have an account, try signing in instead.`,
  [AppErrorCode.INVALID_REQUEST]: msg`We were unable to create your account. Please review the information you provided and try again.`,
};

export type TSignUpFormSchema = z.infer<typeof ZSignUpFormSchema>;

export type SignUpFormProps = {
  className?: string;
  initialEmail?: string;
  isGoogleSSOEnabled?: boolean;
  isMicrosoftSSOEnabled?: boolean;
  isOIDCSSOEnabled?: boolean;
  returnTo?: string;
  // ADDED for BizRethink (overlay 015): captcha site-key flows in via SSR.
  turnstileSiteKey?: string;
};

export const SignUpForm = ({
  className,
  initialEmail,
  isGoogleSSOEnabled,
  isMicrosoftSSOEnabled,
  isOIDCSSOEnabled,
  returnTo,
  turnstileSiteKey: turnstileSiteKeyProp,
}: SignUpFormProps) => {
  const { _ } = useLingui();
  const { toast } = useToast();

  const analytics = useAnalytics();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const utmSrc = searchParams.get('utm_source') ?? null;

  // MODIFIED for BizRethink (overlay 015): prop wins, fall back to env at render.
  const turnstileSiteKey = turnstileSiteKeyProp || env('NEXT_PUBLIC_TURNSTILE_SITE_KEY');
  const turnstileRef = useRef<TurnstileInstance>(null);

  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const hasSocialAuthEnabled = isGoogleSSOEnabled || isMicrosoftSSOEnabled || isOIDCSSOEnabled;

  const form = useForm<TSignUpFormSchema>({
    values: {
      name: '',
      email: initialEmail ?? '',
      password: '',
      signature: '',
    },
    mode: 'onBlur',
    resolver: zodResolver(ZSignUpFormSchema),
  });

  const isSubmitting = form.formState.isSubmitting;

  const onFormSubmit = async ({ name, email, password, signature }: TSignUpFormSchema) => {
    try {
      await authClient.emailPassword.signUp({
        name,
        email,
        password,
        signature,
        captchaToken: captchaToken ?? undefined,
      });

      await navigate(returnTo ? returnTo : '/unverified-account');

      toast({
        title: _(msg`Registration Successful`),
        description: _(
          msg`You have successfully registered. Please verify your account by clicking on the link you received in the email.`,
        ),
        duration: 5000,
      });

      analytics.capture('App: User Sign Up', {
        email,
        timestamp: new Date().toISOString(),
        custom_campaign_params: { src: utmSrc },
      });
    } catch (err) {
      const error = AppError.parseError(err);

      const errorMessage =
        SIGNUP_ERROR_MESSAGES[error.code] ?? SIGNUP_ERROR_MESSAGES.INVALID_REQUEST;

      toast({
        title: _(msg`An error occurred`),
        description: _(errorMessage),
        variant: 'destructive',
      });

      turnstileRef.current?.reset();
      setCaptchaToken(null);
    }
  };

  const onSignUpWithGoogleClick = async () => {
    try {
      await authClient.google.signIn();
    } catch (err) {
      toast({
        title: _(msg`An unknown error occurred`),
        description: _(
          msg`We encountered an unknown error while attempting to sign you Up. Please try again later.`,
        ),
        variant: 'destructive',
      });
    }
  };

  const onSignUpWithMicrosoftClick = async () => {
    try {
      await authClient.microsoft.signIn();
    } catch (err) {
      toast({
        title: _(msg`An unknown error occurred`),
        description: _(
          msg`We encountered an unknown error while attempting to sign you Up. Please try again later.`,
        ),
        variant: 'destructive',
      });
    }
  };

  const onSignUpWithOIDCClick = async () => {
    try {
      await authClient.oidc.signIn();
    } catch (err) {
      toast({
        title: _(msg`An unknown error occurred`),
        description: _(
          msg`We encountered an unknown error while attempting to sign you Up. Please try again later.`,
        ),
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    const hash = window.location.hash.slice(1);

    const params = new URLSearchParams(hash);

    const email = params.get('email');

    if (email) {
      form.setValue('email', email);
    }
  }, [form]);

  return (
    <div className={cn('flex justify-center gap-x-12', className)}>
      <div className="border-border relative hidden flex-1 overflow-hidden rounded-xl border xl:flex">
        <div className="absolute -inset-8 -z-[2] backdrop-blur">
          <img
            src={communityCardsImage}
            alt="community-cards"
            className="h-full w-full object-cover dark:brightness-95 dark:contrast-[70%] dark:invert"
          />
        </div>

        <div className="bg-background/50 absolute -inset-8 -z-[1] backdrop-blur-[2px]" />

        <div className="relative flex h-full w-full flex-col items-center justify-evenly">
          {/* MODIFIED for BizRethink (overlay 054): Pacta voice. */}
          <div className="bg-background rounded-2xl border px-4 py-1 text-sm font-medium">
            <Trans>Built for agreements that hold.</Trans>
          </div>

          <div className="w-full max-w-md">
            <UserProfilePacta
              rows={2}
              className="border-border bg-background rounded-2xl border shadow-md"
            />
          </div>

          <div />
        </div>
      </div>

      <div className="border-border dark:bg-background relative z-10 flex min-h-[min(850px,80vh)] w-full max-w-lg flex-col rounded-xl border bg-neutral-100 p-6">
        <div className="h-20">
          <h1 className="text-xl font-semibold md:text-2xl">
            <Trans>Create a new account</Trans>
          </h1>

          {/* MODIFIED for BizRethink (overlay 054): Pacta voice. */}
          <p className="text-muted-foreground mt-2 text-xs md:text-sm">
            <Trans>
              Create your Pacta account. Send, sign, and seal contracts with timestamped audit
              trails and AATL-grade cryptographic signatures.
            </Trans>
          </p>
        </div>

        <hr className="-mx-6 my-4" />

        <Form {...form}>
          <form
            className="flex w-full flex-1 flex-col gap-y-4"
            onSubmit={form.handleSubmit(onFormSubmit)}
          >
            <fieldset className="flex w-full flex-col gap-y-4" disabled={isSubmitting}>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Trans>Full Name</Trans>
                    </FormLabel>
                    <FormControl>
                      <Input type="text" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Trans>Email Address</Trans>
                    </FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <PendingInvitePreview email={form.watch('email')} />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Trans>Password</Trans>
                    </FormLabel>

                    <FormControl>
                      <PasswordInput {...field} />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="signature"
                render={({ field: { onChange, value } }) => (
                  <FormItem>
                    <FormLabel>
                      <Trans>Sign Here</Trans>
                    </FormLabel>
                    <FormControl>
                      <SignaturePadDialog
                        disabled={isSubmitting}
                        value={value}
                        onChange={(v) => onChange(v ?? '')}
                      />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              {turnstileSiteKey && (
                <Turnstile
                  ref={turnstileRef}
                  siteKey={turnstileSiteKey}
                  onSuccess={setCaptchaToken}
                  onExpire={() => setCaptchaToken(null)}
                  options={{
                    size: 'flexible',
                    appearance: 'interaction-only',
                  }}
                />
              )}

              {hasSocialAuthEnabled && (
                <div className="relative flex items-center justify-center gap-x-4 py-2 text-xs uppercase">
                  <div className="bg-border h-px flex-1" />
                  <span className="text-muted-foreground bg-transparent">
                    <Trans>Or</Trans>
                  </span>
                  <div className="bg-border h-px flex-1" />
                </div>
              )}

              {isGoogleSSOEnabled && (
                <Button
                  type="button"
                  size="lg"
                  variant={'outline'}
                  className="bg-background text-muted-foreground border"
                  disabled={isSubmitting}
                  onClick={onSignUpWithGoogleClick}
                >
                  <FcGoogle className="mr-2 h-5 w-5" />
                  <Trans>Sign Up with Google</Trans>
                </Button>
              )}

              {isMicrosoftSSOEnabled && (
                <Button
                  type="button"
                  size="lg"
                  variant={'outline'}
                  className="bg-background text-muted-foreground border"
                  disabled={isSubmitting}
                  onClick={onSignUpWithMicrosoftClick}
                >
                  <img
                    className="mr-2 h-4 w-4"
                    alt="Microsoft Logo"
                    src={'/static/microsoft.svg'}
                  />
                  <Trans>Sign Up with Microsoft</Trans>
                </Button>
              )}

              {isOIDCSSOEnabled && (
                <Button
                  type="button"
                  size="lg"
                  variant={'outline'}
                  className="bg-background text-muted-foreground border"
                  disabled={isSubmitting}
                  onClick={onSignUpWithOIDCClick}
                >
                  <FaIdCardClip className="mr-2 h-5 w-5" />
                  <Trans>Sign Up with OIDC</Trans>
                </Button>
              )}

              <p className="text-muted-foreground mt-4 text-sm">
                <Trans>
                  Already have an account?{' '}
                  <Link to="/signin" className="text-documenso-700 duration-200 hover:opacity-70">
                    Sign in instead
                  </Link>
                </Trans>
              </p>
            </fieldset>

            <Button
              loading={form.formState.isSubmitting}
              type="submit"
              size="lg"
              className="mt-6 w-full"
            >
              <Trans>Create account</Trans>
            </Button>
          </form>
        </Form>
        <p className="text-muted-foreground mt-6 text-xs">
          <Trans>
            By proceeding, you agree to our{' '}
            <Link
              to="https://bizrethink.ai/terms"
              target="_blank"
              className="text-documenso-700 duration-200 hover:opacity-70"
            >
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link
              to="https://bizrethink.ai/privacy"
              target="_blank"
              className="text-documenso-700 duration-200 hover:opacity-70"
            >
              Privacy Policy
            </Link>
            .
          </Trans>
        </p>
      </div>
    </div>
  );
};

// ADDED for BizRethink (overlay 048c): inline preview component for
// pending OrganisationMemberInvites matching the entered email. Renders
// nothing when the email is empty/invalid or no invites are found.
// Debounced 400ms so we don't hammer the lookup endpoint on every
// keystroke. The lookup endpoint is public (no auth) but only returns
// org NAME + role — no token, no inviter identity.
const PendingInvitePreview = ({ email }: { email: string | undefined }) => {
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const trimmed = (email ?? '').trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@') || !trimmed.includes('.')) {
      setDebounced('');
      return;
    }
    const timer = setTimeout(() => setDebounced(trimmed), 400);
    return () => clearTimeout(timer);
  }, [email]);

  const { data } = trpc.bizrethink.signupInvite.lookup.useQuery(
    { email: debounced },
    { enabled: debounced.length > 0 },
  );

  if (!data || data.pendingInvites.length === 0) {
    return null;
  }

  return (
    <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm dark:border-blue-900/50 dark:bg-blue-950/30">
      <p className="font-medium text-blue-900 dark:text-blue-200">
        <Trans>You'll join after signup</Trans>
      </p>
      <ul className="mt-1 space-y-0.5 text-blue-800 dark:text-blue-300">
        {data.pendingInvites.map((invite, idx) => (
          <li key={idx}>
            • <span className="font-medium">{invite.organisationName}</span> as{' '}
            <span className="lowercase">{invite.organisationRole}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
