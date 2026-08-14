// ADDED for BizRethink (overlay 012), extracted 2026-08-13.
//
// Upstream's 2026-08 sync shrank `admin+/site-settings.tsx` to a thin route that
// composes one component per section. This section used to live inline in that
// route; it now follows upstream's pattern so future syncs stay conflict-free.
import {
  SITE_SETTINGS_SIGNUP_ID,
  type TSiteSettingsSignupSchema,
  ZSiteSettingsSignupSchema,
} from '@bizrethink/customizations/server-only/site-settings/schemas/signup';
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

type AdminSignupGatingSectionProps = {
  signup: TSiteSettingsSignupSchema | undefined;
};

export const AdminSignupGatingSection = ({ signup }: AdminSignupGatingSectionProps) => {
  const { toast } = useToast();
  const { _ } = useLingui();
  const { revalidate } = useRevalidator();

  const { mutateAsync: updateSiteSetting, isPending: isUpdateSiteSettingLoading } =
    trpcReact.admin.updateSiteSetting.useMutation();

  const signupForm = useForm<TSiteSettingsSignupSchema>({
    resolver: zodResolver(ZSiteSettingsSignupSchema),
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

  // ADDED for BizRethink (overlay 012): signup gating section.
  return (
    <div>
      <h2 className="font-semibold">
        <Trans>Signup gating</Trans>
      </h2>
      <p className="mt-2 text-muted-foreground text-sm">
        <Trans>
          Disable signup entirely or restrict it to a list of email domains. This DB-backed setting overrides
          NEXT_PUBLIC_DISABLE_SIGNUP and NEXT_PRIVATE_ALLOWED_SIGNUP_DOMAINS. "Enabled" must be on for the override to
          take effect.
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
                description: _(msg`Signup config updated. New visitors will hit the new policy.`),
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
                  <Trans>When on, /signup redirects to /signin and the "Sign up" link disappears.</Trans>
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
                  <Trans>Empty list means all domains allowed. Only relevant when signup is enabled.</Trans>
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
                    When on AND at least one allowed domain is set, signup additionally requires a matching pending
                    invitation. New signups will be auto-joined to the invited org (no blank Personal Org spawned).
                  </Trans>
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" loading={isUpdateSiteSettingLoading} className="mt-4 justify-end self-end">
            <Trans>Update signup gating</Trans>
          </Button>
        </form>
      </Form>
    </div>
  );
};
