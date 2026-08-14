// ADDED for BizRethink (overlay 015), extracted 2026-08-13.
//
// Upstream's 2026-08 sync shrank `admin+/site-settings.tsx` to a thin route that
// composes one component per section. This section used to live inline in that
// route; it now follows upstream's pattern so future syncs stay conflict-free.
import {
  SITE_SETTINGS_CAPTCHA_ID,
  type TSiteSettingsCaptchaSchema,
  ZSiteSettingsCaptchaSchema,
} from '@bizrethink/customizations/server-only/site-settings/schemas/captcha';
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
import { useToast } from '@documenso/ui/primitives/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';
import { useForm } from 'react-hook-form';
import { useRevalidator } from 'react-router';

type AdminCaptchaSectionProps = {
  captcha: TSiteSettingsCaptchaSchema | undefined;
};

export const AdminCaptchaSection = ({ captcha }: AdminCaptchaSectionProps) => {
  const { toast } = useToast();
  const { _ } = useLingui();
  const { revalidate } = useRevalidator();

  const { mutateAsync: updateSiteSetting, isPending: isUpdateSiteSettingLoading } =
    trpcReact.admin.updateSiteSetting.useMutation();

  const captchaForm = useForm<TSiteSettingsCaptchaSchema>({
    resolver: zodResolver(ZSiteSettingsCaptchaSchema),
    defaultValues: {
      id: SITE_SETTINGS_CAPTCHA_ID,
      enabled: captcha?.enabled ?? false,
      data: {
        siteKey: captcha?.data?.siteKey ?? '',
        secretKey: captcha?.data?.secretKey ?? '',
      },
    },
  });

  // ADDED for BizRethink (overlay 015): captcha (Cloudflare Turnstile) section.
  return (
    <div>
      <h2 className="font-semibold">
        <Trans>Captcha (Cloudflare Turnstile)</Trans>
      </h2>
      <p className="mt-2 text-muted-foreground text-sm">
        <Trans>
          When enabled, signin and signup forms render a Turnstile widget. DB-backed config overrides
          NEXT_PUBLIC_TURNSTILE_SITE_KEY and NEXT_PRIVATE_TURNSTILE_SECRET_KEY.
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
                description: err instanceof Error ? err.message : _(msg`Please try again later.`),
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
                  <input type="text" className="rounded-md border px-3 py-2 text-sm" {...field} />
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
                  <input type="password" className="rounded-md border px-3 py-2 text-sm" {...field} />
                </FormControl>
                <FormDescription>
                  <Trans>
                    Stored cleartext in SiteSettings.data JSON. Postgres column-level access should be restricted to the
                    app role.
                  </Trans>
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" loading={isUpdateSiteSettingLoading} className="mt-4 justify-end self-end">
            <Trans>Update captcha config</Trans>
          </Button>
        </form>
      </Form>
    </div>
  );
};
