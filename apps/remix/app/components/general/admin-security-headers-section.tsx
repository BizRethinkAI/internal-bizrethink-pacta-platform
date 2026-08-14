// ADDED for BizRethink (overlay 032), extracted 2026-08-13.
//
// Upstream's 2026-08 sync shrank `admin+/site-settings.tsx` to a thin route that
// composes one component per section. This section used to live inline in that
// route; it now follows upstream's pattern so future syncs stay conflict-free.
import {
  SITE_SETTINGS_SECURITY_HEADERS_ID,
  type TSiteSettingsSecurityHeadersSchema,
  ZSiteSettingsSecurityHeadersSchema,
} from '@bizrethink/customizations/server-only/site-settings/schemas/security-headers';
import { trpc as trpcReact } from '@documenso/trpc/react';
import { Button } from '@documenso/ui/primitives/button';
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
import { zodResolver } from '@hookform/resolvers/zod';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';
import { useForm } from 'react-hook-form';
import { useRevalidator } from 'react-router';

type AdminSecurityHeadersSectionProps = {
  securityHeaders: TSiteSettingsSecurityHeadersSchema | undefined;
};

export const AdminSecurityHeadersSection = ({ securityHeaders }: AdminSecurityHeadersSectionProps) => {
  const { toast } = useToast();
  const { _ } = useLingui();
  const { revalidate } = useRevalidator();

  const { mutateAsync: updateSiteSetting, isPending: isUpdateSiteSettingLoading } =
    trpcReact.admin.updateSiteSetting.useMutation();

  const securityHeadersForm = useForm<TSiteSettingsSecurityHeadersSchema>({
    resolver: zodResolver(ZSiteSettingsSecurityHeadersSchema),
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

  // ADDED for BizRethink (overlay 032): security-headers section.
  return (
    <div>
      <h2 className="font-semibold">
        <Trans>Security Headers</Trans>
      </h2>

      <p className="mt-2 text-muted-foreground text-sm">
        <Trans>
          HTTP response headers added to every page. Documenso already ships a strict CSP with per-request nonces —
          these settings cover the headers it doesn't ship by default (HSTS, Permissions-Policy) plus globalize
          Referrer-Policy and X-Content-Type-Options across all routes (upstream sets them only on /embed).
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
                description: err instanceof Error ? err.message : _(msg`Please try again later.`),
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
                    Master toggle. When off, Documenso's default CSP middleware still runs but no extra BizRethink
                    headers are added.
                  </Trans>
                </FormDescription>
              </FormItem>
            )}
          />

          <div className="mt-6 rounded-lg border border-border p-4">
            <h3 className="font-semibold text-sm">
              <Trans>Strict-Transport-Security (HSTS)</Trans>
            </h3>

            <p className="mt-1 text-muted-foreground text-xs">
              <Trans>
                Tells browsers to only load this domain over HTTPS for the configured duration. Enable AFTER verifying
                every subdomain you serve is HTTPS-only, otherwise includeSubdomains can break HTTP-only siblings.
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
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={field.value}
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                      />
                    </FormControl>
                    <FormDescription>
                      <Trans>
                        31536000 = 1 year (recommended once verified). Lower values let you back out faster if something
                        breaks.
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
                        Forces HTTPS on every subdomain of this host. Only enable after confirming all *.your-domain are
                        HTTPS-only.
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
                        Marks the domain as eligible for the browser-vendor HSTS preload list. Submit at hstspreload.org
                        after enabling. Removal takes months — be sure.
                      </Trans>
                    </FormDescription>
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-border p-4">
            <h3 className="font-semibold text-sm">
              <Trans>Permissions-Policy</Trans>
            </h3>

            <p className="mt-1 text-muted-foreground text-xs">
              <Trans>
                Tells browsers which features (camera, microphone, geolocation, etc.) are denied for this origin.
                Reduces blast radius if XSS ever ships.
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
                      <Textarea className="h-20 font-mono text-xs" value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormDescription>
                      <Trans>
                        Comma-separated directives. Empty parens = deny. See
                        developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy for the full directive
                        list.
                      </Trans>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <Button type="submit" loading={isUpdateSiteSettingLoading} className="mt-6 justify-end self-end">
            <Trans>Update security headers</Trans>
          </Button>
        </form>
      </Form>
    </div>
  );
};
