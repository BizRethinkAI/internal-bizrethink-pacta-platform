// ADDED for BizRethink (overlay 015): captcha section schema.
import {
  SITE_SETTINGS_CAPTCHA_ID,
  ZSiteSettingsCaptchaSchema,
} from '@bizrethink/customizations/server-only/site-settings/schemas/captcha';
// ADDED for BizRethink (overlay 032): security-headers section schema.
import {
  SITE_SETTINGS_SECURITY_HEADERS_ID,
  ZSiteSettingsSecurityHeadersSchema,
} from '@bizrethink/customizations/server-only/site-settings/schemas/security-headers';
// ADDED for BizRethink (overlay 012): signup section schema lives in our package.
import {
  SITE_SETTINGS_SIGNUP_ID,
  ZSiteSettingsSignupSchema,
} from '@bizrethink/customizations/server-only/site-settings/schemas/signup';
// ADDED for BizRethink (overlay 017): webhook section schema.
import {
  SITE_SETTINGS_WEBHOOK_ID,
  ZSiteSettingsWebhookSchema,
} from '@bizrethink/customizations/server-only/site-settings/schemas/webhook';
import { zodResolver } from '@hookform/resolvers/zod';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';
import { useForm } from 'react-hook-form';
import { useRevalidator } from 'react-router';
import type { z } from 'zod';

import { getSiteSettings } from '@documenso/lib/server-only/site-settings/get-site-settings';
import {
  SITE_SETTINGS_BANNER_ID,
  ZSiteSettingsBannerSchema,
} from '@documenso/lib/server-only/site-settings/schemas/banner';
import { trpc as trpcReact } from '@documenso/trpc/react';
import { Button } from '@documenso/ui/primitives/button';
import { ColorPicker } from '@documenso/ui/primitives/color-picker';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@documenso/ui/primitives/form/form';
import { Switch } from '@documenso/ui/primitives/switch';
import { Textarea } from '@documenso/ui/primitives/textarea';
import { useToast } from '@documenso/ui/primitives/use-toast';

import { SettingsHeader } from '~/components/general/settings-header';

import type { Route } from './+types/site-settings';

const ZBannerFormSchema = ZSiteSettingsBannerSchema;

type TBannerFormSchema = z.infer<typeof ZBannerFormSchema>;

// ADDED for BizRethink (overlay 012): signup section uses the bizrethink schema.
const ZSignupFormSchema = ZSiteSettingsSignupSchema;
type TSignupFormSchema = z.infer<typeof ZSignupFormSchema>;

// ADDED for BizRethink (overlay 015): captcha section.
const ZCaptchaFormSchema = ZSiteSettingsCaptchaSchema;
type TCaptchaFormSchema = z.infer<typeof ZCaptchaFormSchema>;

// ADDED for BizRethink (overlay 017): webhook section.
const ZWebhookFormSchema = ZSiteSettingsWebhookSchema;
type TWebhookFormSchema = z.infer<typeof ZWebhookFormSchema>;

// ADDED for BizRethink (overlay 032): security-headers section.
const ZSecurityHeadersFormSchema = ZSiteSettingsSecurityHeadersSchema;
type TSecurityHeadersFormSchema = z.infer<typeof ZSecurityHeadersFormSchema>;

export async function loader() {
  const all = await getSiteSettings();
  const banner = all.find((setting) => setting.id === SITE_SETTINGS_BANNER_ID);
  const signup = all.find((setting) => setting.id === SITE_SETTINGS_SIGNUP_ID);
  const captcha = all.find((setting) => setting.id === SITE_SETTINGS_CAPTCHA_ID);
  const webhook = all.find((setting) => setting.id === SITE_SETTINGS_WEBHOOK_ID);
  const securityHeaders = all.find((setting) => setting.id === SITE_SETTINGS_SECURITY_HEADERS_ID);

  return { banner, signup, captcha, webhook, securityHeaders };
}

export default function AdminBannerPage({ loaderData }: Route.ComponentProps) {
  const { banner, signup, captcha, webhook, securityHeaders } = loaderData;

  const { toast } = useToast();
  const { _ } = useLingui();
  const { revalidate } = useRevalidator();

  const form = useForm<TBannerFormSchema>({
    resolver: zodResolver(ZBannerFormSchema),
    defaultValues: {
      id: SITE_SETTINGS_BANNER_ID,
      enabled: banner?.enabled ?? false,
      data: {
        content: banner?.data?.content ?? '',
        bgColor: banner?.data?.bgColor ?? '#000000',
        textColor: banner?.data?.textColor ?? '#FFFFFF',
      },
    },
  });

  // ADDED for BizRethink (overlay 012): signup section form.
  const signupForm = useForm<TSignupFormSchema>({
    resolver: zodResolver(ZSignupFormSchema),
    defaultValues: {
      id: SITE_SETTINGS_SIGNUP_ID,
      enabled: signup?.enabled ?? false,
      data: {
        signupDisabled: signup?.data?.signupDisabled ?? false,
        allowedDomains: signup?.data?.allowedDomains ?? [],
        // Phase L (2026-05-11): require pending invite when domain-gated.
        requireInviteWhenDomainGated: signup?.data?.requireInviteWhenDomainGated ?? false,
      },
    },
  });

  // ADDED for BizRethink (overlay 015): captcha section form.
  const captchaForm = useForm<TCaptchaFormSchema>({
    resolver: zodResolver(ZCaptchaFormSchema),
    defaultValues: {
      id: SITE_SETTINGS_CAPTCHA_ID,
      enabled: captcha?.enabled ?? false,
      data: {
        siteKey: captcha?.data?.siteKey ?? '',
        secretKey: captcha?.data?.secretKey ?? '',
      },
    },
  });

  // ADDED for BizRethink (overlay 017): webhook section form.
  const webhookForm = useForm<TWebhookFormSchema>({
    resolver: zodResolver(ZWebhookFormSchema),
    defaultValues: {
      id: SITE_SETTINGS_WEBHOOK_ID,
      enabled: webhook?.enabled ?? false,
      data: {
        ssrfBypassHosts: webhook?.data?.ssrfBypassHosts ?? [],
      },
    },
  });

  // ADDED for BizRethink (overlay 032): security-headers form.
  const securityHeadersForm = useForm<TSecurityHeadersFormSchema>({
    resolver: zodResolver(ZSecurityHeadersFormSchema),
    defaultValues: {
      id: SITE_SETTINGS_SECURITY_HEADERS_ID,
      enabled: securityHeaders?.enabled ?? true,
      data: {
        hsts: {
          enabled: securityHeaders?.data?.hsts?.enabled ?? false,
          maxAgeSeconds: securityHeaders?.data?.hsts?.maxAgeSeconds ?? 31536000,
          includeSubdomains: securityHeaders?.data?.hsts?.includeSubdomains ?? false,
          preload: securityHeaders?.data?.hsts?.preload ?? false,
        },
        permissionsPolicy: {
          enabled: securityHeaders?.data?.permissionsPolicy?.enabled ?? true,
          value:
            securityHeaders?.data?.permissionsPolicy?.value ??
            'camera=(), microphone=(), geolocation=(), interest-cohort=()',
        },
      },
    },
  });

  const enabled = form.watch('enabled');

  const { mutateAsync: updateSiteSetting, isPending: isUpdateSiteSettingLoading } =
    trpcReact.admin.updateSiteSetting.useMutation();

  const onBannerUpdate = async ({ id, enabled, data }: TBannerFormSchema) => {
    try {
      await updateSiteSetting({
        id,
        enabled,
        data,
      });

      toast({
        title: _(msg`Banner Updated`),
        description: _(msg`Your banner has been updated successfully.`),
        duration: 5000,
      });

      await revalidate();
    } catch (err) {
      toast({
        title: _(msg`An unknown error occurred`),
        variant: 'destructive',
        description: _(
          msg`We encountered an unknown error while attempting to update the banner. Please try again later.`,
        ),
      });
    }
  };

  return (
    <div>
      <SettingsHeader
        title={_(msg`Site Settings`)}
        subtitle={_(msg`Manage your site settings here`)}
      />

      <div className="mt-8">
        <div>
          <h2 className="font-semibold">
            <Trans>Site Banner</Trans>
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">
            <Trans>
              The site banner is a message that is shown at the top of the site. It can be used to
              display important information to your users.
            </Trans>
          </p>

          <Form {...form}>
            <form
              className="mt-4 flex flex-col rounded-md"
              onSubmit={form.handleSubmit(onBannerUpdate)}
            >
              <div className="mt-4 flex flex-col gap-4 md:flex-row">
                <FormField
                  control={form.control}
                  name="enabled"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>
                        <Trans>Enabled</Trans>
                      </FormLabel>

                      <FormControl>
                        <div>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <fieldset
                  className="flex flex-col gap-4 md:flex-row"
                  disabled={!enabled}
                  aria-disabled={!enabled}
                >
                  <FormField
                    control={form.control}
                    name="data.bgColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <Trans>Background Color</Trans>
                        </FormLabel>

                        <FormControl>
                          <div>
                            <ColorPicker {...field} />
                          </div>
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="data.textColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <Trans>Text Color</Trans>
                        </FormLabel>

                        <FormControl>
                          <div>
                            <ColorPicker {...field} />
                          </div>
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </fieldset>
              </div>

              <fieldset disabled={!enabled} aria-disabled={!enabled}>
                <FormField
                  control={form.control}
                  name="data.content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <Trans>Content</Trans>
                      </FormLabel>

                      <FormControl>
                        <Textarea className="h-32 resize-none" {...field} />
                      </FormControl>

                      <FormDescription>
                        <Trans>The content to show in the banner, HTML is allowed</Trans>
                      </FormDescription>

                      <FormMessage />
                    </FormItem>
                  )}
                />
              </fieldset>

              <Button
                type="submit"
                loading={isUpdateSiteSettingLoading}
                className="mt-4 justify-end self-end"
              >
                <Trans>Update Banner</Trans>
              </Button>
            </form>
          </Form>
        </div>

        {/* ADDED for BizRethink (overlay 012): signup gating section. */}
        <div className="mt-12">
          <h2 className="font-semibold">
            <Trans>Signup gating</Trans>
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">
            <Trans>
              Disable signup entirely or restrict it to a list of email domains. This DB-backed
              setting overrides NEXT_PUBLIC_DISABLE_SIGNUP and NEXT_PRIVATE_ALLOWED_SIGNUP_DOMAINS.
              "Enabled" must be on for the override to take effect.
            </Trans>
          </p>

          <Form {...signupForm}>
            <form
              className="mt-4 flex flex-col gap-4 rounded-md"
              onSubmit={signupForm.handleSubmit(async ({ id, enabled, data }) => {
                try {
                  await updateSiteSetting({ id, enabled, data });
                  toast({
                    title: _(msg`Signup gating saved`),
                    description: _(
                      msg`Signup config updated. New visitors will hit the new policy.`,
                    ),
                  });
                  await revalidate();
                } catch (err) {
                  toast({
                    title: _(msg`An unknown error occurred`),
                    description:
                      err instanceof Error ? err.message : _(msg`Please try again later.`),
                    variant: 'destructive',
                  });
                }
              })}
            >
              <FormField
                control={signupForm.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Trans>Enabled (override env)</Trans>
                    </FormLabel>
                    <FormControl>
                      <div>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={signupForm.control}
                name="data.signupDisabled"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Trans>Disable signup</Trans>
                    </FormLabel>
                    <FormControl>
                      <div>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </div>
                    </FormControl>
                    <FormDescription>
                      <Trans>
                        When on, /signup redirects to /signin and the "Sign up" link disappears.
                      </Trans>
                    </FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={signupForm.control}
                name="data.allowedDomains"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Trans>Allowed signup domains (one per line)</Trans>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        className="h-24 font-mono text-xs"
                        value={(field.value ?? []).join('\n')}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              .split('\n')
                              .map((d) => d.trim())
                              .filter(Boolean),
                          )
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      <Trans>
                        Empty list means all domains allowed. Only relevant when signup is enabled.
                      </Trans>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Phase L (2026-05-11): require pending invite when domain-gated. */}
              <FormField
                control={signupForm.control}
                name="data.requireInviteWhenDomainGated"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>
                      <Trans>Require an invitation</Trans>
                    </FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormDescription>
                      <Trans>
                        When on AND at least one allowed domain is set, signup additionally requires
                        a matching pending invitation. New signups will be auto-joined to the
                        invited org (no blank Personal Org spawned).
                      </Trans>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                loading={isUpdateSiteSettingLoading}
                className="mt-4 justify-end self-end"
              >
                <Trans>Update signup gating</Trans>
              </Button>
            </form>
          </Form>
        </div>

        {/* ADDED for BizRethink (overlay 015): captcha (Cloudflare Turnstile) section. */}
        <div className="mt-12">
          <h2 className="font-semibold">
            <Trans>Captcha (Cloudflare Turnstile)</Trans>
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">
            <Trans>
              When enabled, signin and signup forms render a Turnstile widget. DB-backed config
              overrides NEXT_PUBLIC_TURNSTILE_SITE_KEY and NEXT_PRIVATE_TURNSTILE_SECRET_KEY.
            </Trans>
          </p>

          <Form {...captchaForm}>
            <form
              className="mt-4 flex flex-col gap-4 rounded-md"
              onSubmit={captchaForm.handleSubmit(async ({ id, enabled, data }) => {
                try {
                  await updateSiteSetting({ id, enabled, data });
                  toast({
                    title: _(msg`Captcha config saved`),
                  });
                  await revalidate();
                } catch (err) {
                  toast({
                    title: _(msg`An unknown error occurred`),
                    description:
                      err instanceof Error ? err.message : _(msg`Please try again later.`),
                    variant: 'destructive',
                  });
                }
              })}
            >
              <FormField
                control={captchaForm.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Trans>Enabled</Trans>
                    </FormLabel>
                    <FormControl>
                      <div>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={captchaForm.control}
                name="data.siteKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Trans>Site key (public)</Trans>
                    </FormLabel>
                    <FormControl>
                      <input
                        type="text"
                        className="rounded-md border px-3 py-2 text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={captchaForm.control}
                name="data.secretKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Trans>Secret key (server-side)</Trans>
                    </FormLabel>
                    <FormControl>
                      <input
                        type="password"
                        className="rounded-md border px-3 py-2 text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      <Trans>
                        Stored cleartext in SiteSettings.data JSON. Postgres column-level access
                        should be restricted to the app role.
                      </Trans>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                loading={isUpdateSiteSettingLoading}
                className="mt-4 justify-end self-end"
              >
                <Trans>Update captcha config</Trans>
              </Button>
            </form>
          </Form>
        </div>

        {/* ADDED for BizRethink (overlay 017): webhook SSRF bypass hosts. */}
        <div className="mt-12">
          <h2 className="font-semibold">
            <Trans>Webhook SSRF bypass hosts</Trans>
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">
            <Trans>
              Hostnames listed here are allowed to resolve to private/loopback addresses for
              outbound webhook delivery. Useful for hitting Docker-internal services. Merged with
              NEXT_PRIVATE_WEBHOOK_SSRF_BYPASS_HOSTS env var. "Enabled" must be on for the DB list
              to take effect.
            </Trans>
          </p>

          <Form {...webhookForm}>
            <form
              className="mt-4 flex flex-col gap-4 rounded-md"
              onSubmit={webhookForm.handleSubmit(async ({ id, enabled, data }) => {
                try {
                  await updateSiteSetting({ id, enabled, data });
                  toast({
                    title: _(msg`Webhook config saved`),
                  });
                  await revalidate();
                } catch (err) {
                  toast({
                    title: _(msg`An unknown error occurred`),
                    description:
                      err instanceof Error ? err.message : _(msg`Please try again later.`),
                    variant: 'destructive',
                  });
                }
              })}
            >
              <FormField
                control={webhookForm.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Trans>Enabled</Trans>
                    </FormLabel>
                    <FormControl>
                      <div>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={webhookForm.control}
                name="data.ssrfBypassHosts"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Trans>SSRF bypass hosts (one per line)</Trans>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        className="h-24 font-mono text-xs"
                        value={(field.value ?? []).join('\n')}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              .split('\n')
                              .map((d) => d.trim())
                              .filter(Boolean),
                          )
                        }
                        placeholder="api.internal.bizrethink.ai\n10.0.0.5"
                      />
                    </FormControl>
                    <FormDescription>
                      <Trans>
                        Hostnames or IP literals. Webhooks targeting these hosts skip the
                        private-address SSRF guard.
                      </Trans>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                loading={isUpdateSiteSettingLoading}
                className="mt-4 justify-end self-end"
              >
                <Trans>Update webhook config</Trans>
              </Button>
            </form>
          </Form>
        </div>

        {/* ADDED for BizRethink (overlay 032): security-headers section. */}
        <div className="mt-12">
          <h2 className="font-semibold">
            <Trans>Security Headers</Trans>
          </h2>

          <p className="text-muted-foreground mt-2 text-sm">
            <Trans>
              HTTP response headers added to every page. Documenso already ships a strict CSP with
              per-request nonces — these settings cover the headers it doesn't ship by default
              (HSTS, Permissions-Policy) plus globalize Referrer-Policy and X-Content-Type-Options
              across all routes (upstream sets them only on /embed).
            </Trans>
          </p>

          <Form {...securityHeadersForm}>
            <form
              className="mt-4 flex flex-col"
              onSubmit={securityHeadersForm.handleSubmit(async ({ id, enabled, data }) => {
                try {
                  await updateSiteSetting({ id, enabled, data });

                  toast({
                    title: _(msg`Security headers updated`),
                    description: _(msg`Headers will apply to new responses. No restart required.`),
                    duration: 5000,
                  });

                  await revalidate();
                } catch (err) {
                  toast({
                    title: _(msg`Failed to update security headers`),
                    description:
                      err instanceof Error ? err.message : _(msg`Please try again later.`),
                    variant: 'destructive',
                  });
                }
              })}
            >
              <FormField
                control={securityHeadersForm.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Trans>Enabled</Trans>
                    </FormLabel>
                    <FormControl>
                      <div>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </div>
                    </FormControl>
                    <FormDescription>
                      <Trans>
                        Master toggle. When off, Documenso's default CSP middleware still runs but
                        no extra BizRethink headers are added.
                      </Trans>
                    </FormDescription>
                  </FormItem>
                )}
              />

              <div className="border-border mt-6 rounded-lg border p-4">
                <h3 className="text-sm font-semibold">
                  <Trans>Strict-Transport-Security (HSTS)</Trans>
                </h3>

                <p className="text-muted-foreground mt-1 text-xs">
                  <Trans>
                    Tells browsers to only load this domain over HTTPS for the configured duration.
                    Enable AFTER verifying every subdomain you serve is HTTPS-only, otherwise
                    includeSubdomains can break HTTP-only siblings.
                  </Trans>
                </p>

                <div className="mt-4 space-y-4">
                  <FormField
                    control={securityHeadersForm.control}
                    name="data.hsts.enabled"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <Trans>Send HSTS header</Trans>
                        </FormLabel>
                        <FormControl>
                          <div>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={securityHeadersForm.control}
                    name="data.hsts.maxAgeSeconds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <Trans>max-age (seconds)</Trans>
                        </FormLabel>
                        <FormControl>
                          <input
                            type="number"
                            className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
                            value={field.value}
                            onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          <Trans>
                            31536000 = 1 year (recommended once verified). Lower values let you back
                            out faster if something breaks.
                          </Trans>
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={securityHeadersForm.control}
                    name="data.hsts.includeSubdomains"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <Trans>includeSubDomains</Trans>
                        </FormLabel>
                        <FormControl>
                          <div>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </div>
                        </FormControl>
                        <FormDescription>
                          <Trans>
                            Forces HTTPS on every subdomain of this host. Only enable after
                            confirming all *.your-domain are HTTPS-only.
                          </Trans>
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={securityHeadersForm.control}
                    name="data.hsts.preload"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <Trans>preload</Trans>
                        </FormLabel>
                        <FormControl>
                          <div>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </div>
                        </FormControl>
                        <FormDescription>
                          <Trans>
                            Marks the domain as eligible for the browser-vendor HSTS preload list.
                            Submit at hstspreload.org after enabling. Removal takes months — be
                            sure.
                          </Trans>
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="border-border mt-6 rounded-lg border p-4">
                <h3 className="text-sm font-semibold">
                  <Trans>Permissions-Policy</Trans>
                </h3>

                <p className="text-muted-foreground mt-1 text-xs">
                  <Trans>
                    Tells browsers which features (camera, microphone, geolocation, etc.) are denied
                    for this origin. Reduces blast radius if XSS ever ships.
                  </Trans>
                </p>

                <div className="mt-4 space-y-4">
                  <FormField
                    control={securityHeadersForm.control}
                    name="data.permissionsPolicy.enabled"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <Trans>Send Permissions-Policy header</Trans>
                        </FormLabel>
                        <FormControl>
                          <div>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={securityHeadersForm.control}
                    name="data.permissionsPolicy.value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <Trans>Header value</Trans>
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            className="h-20 font-mono text-xs"
                            value={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormDescription>
                          <Trans>
                            Comma-separated directives. Empty parens = deny. See
                            developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy for
                            the full directive list.
                          </Trans>
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Button
                type="submit"
                loading={isUpdateSiteSettingLoading}
                className="mt-6 justify-end self-end"
              >
                <Trans>Update security headers</Trans>
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
