import { useEffect, useState } from 'react';

import { isSsoDisabledByBuild } from '@bizrethink/customizations/feature-flags';
import { msg } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';

import { trpc } from '@documenso/trpc/react';
import { Button } from '@documenso/ui/primitives/button';
import { Input } from '@documenso/ui/primitives/input';
import { Label } from '@documenso/ui/primitives/label';
import { SpinnerBox } from '@documenso/ui/primitives/spinner';
import { Switch } from '@documenso/ui/primitives/switch';
import { useToast } from '@documenso/ui/primitives/use-toast';

import { SettingsHeader } from '~/components/general/settings-header';
import { appMetaTags } from '~/utils/meta';

import type { Route } from './+types/sso-providers';

// Phase F (overlay 014): admin UI for SSO providers (Google / Microsoft / OIDC).
//
// Replaces 9 NEXT_PRIVATE_GOOGLE_*/MICROSOFT_*/OIDC_* env vars with one row
// per provider in BizrethinkSsoProvider. Each provider has its own card with
// enable toggle + clientId/secret + (oidc-only) wellKnownUrl/label/skipVerify/prompt.

export function meta() {
  return appMetaTags(msg`SSO Providers`);
}

type Provider = 'google' | 'microsoft' | 'oidc';

type ProviderForm = {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  // oidc-only
  oidcWellKnownUrl: string;
  oidcProviderLabel: string;
  oidcSkipVerify: boolean;
  oidcPrompt: string;
};

const EMPTY_FORM: ProviderForm = {
  enabled: false,
  clientId: '',
  clientSecret: '',
  oidcWellKnownUrl: '',
  oidcProviderLabel: '',
  oidcSkipVerify: false,
  oidcPrompt: '',
};

const PROVIDER_LABELS: Record<Provider, string> = {
  google: 'Google',
  microsoft: 'Microsoft',
  oidc: 'OIDC (custom)',
};

// 2026-09 incident: SSO is removed from this build (feature-flags.ts). The
// switch is read on the server; the config form is not rendered while it is on.
export function loader() {
  return { ssoDisabledByBuild: isSsoDisabledByBuild() };
}

export default function AdminSsoProvidersPage({ loaderData }: Route.ComponentProps) {
  const { t } = useLingui();

  if (loaderData.ssoDisabledByBuild) {
    return (
      <div>
        <SettingsHeader title={t`SSO Providers`} subtitle="" />
        <p className="mt-6 max-w-2xl text-sm text-muted-foreground">
          <Trans>SSO is disabled in this build.</Trans>
        </p>
      </div>
    );
  }

  return <SsoProvidersConfig />;
}

function SsoProvidersConfig() {
  const { t } = useLingui();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const { data: providers, isLoading } = trpc.bizrethink.ssoProvider.list.useQuery();
  const updateMutation = trpc.bizrethink.ssoProvider.update.useMutation();
  const deleteMutation = trpc.bizrethink.ssoProvider.delete.useMutation();

  const [forms, setForms] = useState<Record<Provider, ProviderForm>>({
    google: EMPTY_FORM,
    microsoft: EMPTY_FORM,
    oidc: EMPTY_FORM,
  });

  useEffect(() => {
    if (!providers) return;
    setForms({
      google: hydrate(providers.find((p) => p.provider === 'google')),
      microsoft: hydrate(providers.find((p) => p.provider === 'microsoft')),
      oidc: hydrate(providers.find((p) => p.provider === 'oidc')),
    });
  }, [providers]);

  const setForm = (provider: Provider, fn: (prev: ProviderForm) => ProviderForm) => {
    setForms((prev) => ({ ...prev, [provider]: fn(prev[provider]) }));
  };

  const onSave = async (provider: Provider) => {
    try {
      await updateMutation.mutateAsync({ provider, ...forms[provider] });
      toast({ title: t`${PROVIDER_LABELS[provider]} provider saved` });
      // Clear secrets after save.
      setForm(provider, (p) => ({ ...p, clientId: '', clientSecret: '' }));
      await utils.bizrethink.ssoProvider.list.invalidate();
    } catch (err) {
      toast({
        title: t`Failed to save`,
        description: err instanceof Error ? err.message : t`Unknown error`,
        variant: 'destructive',
      });
    }
  };

  const onDelete = async (provider: Provider) => {
    if (!window.confirm(t`Delete ${PROVIDER_LABELS[provider]} provider config? Falls back to env.`))
      return;
    try {
      await deleteMutation.mutateAsync({ provider });
      toast({ title: t`${PROVIDER_LABELS[provider]} provider removed` });
      setForm(provider, () => EMPTY_FORM);
      await utils.bizrethink.ssoProvider.list.invalidate();
    } catch (err) {
      toast({
        title: t`Failed to delete`,
        description: err instanceof Error ? err.message : t`Unknown error`,
        variant: 'destructive',
      });
    }
  };

  if (isLoading || !providers) return <SpinnerBox className="py-32" />;

  return (
    <div>
      <SettingsHeader
        title={t`SSO Providers`}
        subtitle={t`Configure Google / Microsoft / OIDC sign-in. Stored encrypted at rest. DB row overrides NEXT_PRIVATE_*_CLIENT_ID/_SECRET env vars.`}
      />

      <div className="mt-6 max-w-2xl space-y-8">
        {(['google', 'microsoft', 'oidc'] as const).map((provider) => {
          const status = providers.find((p) => p.provider === provider);
          const form = forms[provider];
          const hasSecrets = status?.hasClientId && status?.hasClientSecret;

          return (
            <fieldset key={provider} className="space-y-4 rounded-md border p-4">
              <legend className="px-2 text-sm font-semibold">{PROVIDER_LABELS[provider]}</legend>

              <div className="flex items-center gap-2">
                <Switch
                  checked={form.enabled}
                  onCheckedChange={(v) => setForm(provider, (p) => ({ ...p, enabled: v }))}
                  id={`enabled-${provider}`}
                />
                <Label htmlFor={`enabled-${provider}`}>
                  <Trans>Enabled</Trans>
                </Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`client-id-${provider}`}>
                    <Trans>Client ID</Trans>
                  </Label>
                  <Input
                    id={`client-id-${provider}`}
                    type="password"
                    value={form.clientId}
                    onChange={(e) => setForm(provider, (p) => ({ ...p, clientId: e.target.value }))}
                    placeholder={hasSecrets ? t`(leave empty to keep)` : t`Required`}
                  />
                </div>
                <div>
                  <Label htmlFor={`client-secret-${provider}`}>
                    <Trans>Client secret</Trans>
                  </Label>
                  <Input
                    id={`client-secret-${provider}`}
                    type="password"
                    value={form.clientSecret}
                    onChange={(e) =>
                      setForm(provider, (p) => ({ ...p, clientSecret: e.target.value }))
                    }
                    placeholder={hasSecrets ? t`(leave empty to keep)` : t`Required`}
                  />
                </div>
              </div>

              {provider === 'oidc' && (
                <>
                  <div>
                    <Label htmlFor="oidc-well-known">
                      <Trans>Well-known URL</Trans>
                    </Label>
                    <Input
                      id="oidc-well-known"
                      value={form.oidcWellKnownUrl}
                      onChange={(e) =>
                        setForm('oidc', (p) => ({ ...p, oidcWellKnownUrl: e.target.value }))
                      }
                      placeholder="https://idp.example.com/.well-known/openid-configuration"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="oidc-label">
                        <Trans>Provider label (button text)</Trans>
                      </Label>
                      <Input
                        id="oidc-label"
                        value={form.oidcProviderLabel}
                        onChange={(e) =>
                          setForm('oidc', (p) => ({ ...p, oidcProviderLabel: e.target.value }))
                        }
                        placeholder="OIDC"
                      />
                    </div>
                    <div>
                      <Label htmlFor="oidc-prompt">
                        <Trans>Prompt (none / login / consent / select_account)</Trans>
                      </Label>
                      <Input
                        id="oidc-prompt"
                        value={form.oidcPrompt}
                        onChange={(e) =>
                          setForm('oidc', (p) => ({ ...p, oidcPrompt: e.target.value }))
                        }
                        placeholder=""
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={form.oidcSkipVerify}
                      onCheckedChange={(v) => setForm('oidc', (p) => ({ ...p, oidcSkipVerify: v }))}
                      id="oidc-skip-verify"
                    />
                    <Label htmlFor="oidc-skip-verify">
                      <Trans>Bypass email verification</Trans>
                    </Label>
                  </div>
                </>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={async () => onSave(provider)} loading={updateMutation.isPending}>
                  <Trans>Save</Trans>
                </Button>
                {status?.updatedAt && (
                  <Button
                    variant="destructive"
                    onClick={async () => onDelete(provider)}
                    loading={deleteMutation.isPending}
                    className="ml-auto"
                  >
                    <Trans>Reset to env</Trans>
                  </Button>
                )}
              </div>
            </fieldset>
          );
        })}
      </div>
    </div>
  );
}

const hydrate = (
  status:
    | {
        oidcWellKnownUrl: string | null;
        oidcProviderLabel: string | null;
        oidcSkipVerify: boolean;
        oidcPrompt: string | null;
        enabled: boolean;
      }
    | undefined,
): ProviderForm => ({
  enabled: status?.enabled ?? false,
  clientId: '',
  clientSecret: '',
  oidcWellKnownUrl: status?.oidcWellKnownUrl ?? '',
  oidcProviderLabel: status?.oidcProviderLabel ?? '',
  oidcSkipVerify: status?.oidcSkipVerify ?? false,
  oidcPrompt: status?.oidcPrompt ?? '',
});
