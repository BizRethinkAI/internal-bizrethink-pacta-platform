// ADDED for BizRethink (overlay 017), extracted 2026-08-13.
//
// Upstream's 2026-08 sync shrank `admin+/site-settings.tsx` to a thin route that
// composes one component per section. This section used to live inline in that
// route; it now follows upstream's pattern so future syncs stay conflict-free.
import {
  SITE_SETTINGS_WEBHOOK_ID,
  type TSiteSettingsWebhookSchema,
  ZSiteSettingsWebhookSchema,
} from '@bizrethink/customizations/server-only/site-settings/schemas/webhook';
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

type AdminWebhookSectionProps = {
  webhook: TSiteSettingsWebhookSchema | undefined;
};

export const AdminWebhookSection = ({ webhook }: AdminWebhookSectionProps) => {
  const { toast } = useToast();
  const { _ } = useLingui();
  const { revalidate } = useRevalidator();

  const { mutateAsync: updateSiteSetting, isPending: isUpdateSiteSettingLoading } =
    trpcReact.admin.updateSiteSetting.useMutation();

  const webhookForm = useForm<TSiteSettingsWebhookSchema>({
    resolver: zodResolver(ZSiteSettingsWebhookSchema),
    defaultValues: {
      id: SITE_SETTINGS_WEBHOOK_ID,
      enabled: webhook?.enabled ?? false,
      data: {
        ssrfBypassHosts: webhook?.data?.ssrfBypassHosts ?? [],
      },
    },
  });

  // ADDED for BizRethink (overlay 017): webhook SSRF bypass hosts.
  return (
    <div>
      <h2 className="font-semibold">
        <Trans>Webhook SSRF bypass hosts</Trans>
      </h2>
      <p className="mt-2 text-muted-foreground text-sm">
        <Trans>
          Hostnames listed here are allowed to resolve to private/loopback addresses for outbound webhook delivery.
          Useful for hitting Docker-internal services. Merged with NEXT_PRIVATE_WEBHOOK_SSRF_BYPASS_HOSTS env var.
          "Enabled" must be on for the DB list to take effect.
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
                description: err instanceof Error ? err.message : _(msg`Please try again later.`),
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
                    Hostnames or IP literals. Webhooks targeting these hosts skip the private-address SSRF guard.
                  </Trans>
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" loading={isUpdateSiteSettingLoading} className="mt-4 justify-end self-end">
            <Trans>Update webhook config</Trans>
          </Button>
        </form>
      </Form>
    </div>
  );
};
