import { useEffect, useState } from 'react';

import { msg } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';

import { trpc } from '@documenso/trpc/react';
import { Alert, AlertDescription, AlertTitle } from '@documenso/ui/primitives/alert';
import { Badge } from '@documenso/ui/primitives/badge';
import { Button } from '@documenso/ui/primitives/button';
import { Input } from '@documenso/ui/primitives/input';
import { Label } from '@documenso/ui/primitives/label';
import { SpinnerBox } from '@documenso/ui/primitives/spinner';
import { Switch } from '@documenso/ui/primitives/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@documenso/ui/primitives/tabs';
import { useToast } from '@documenso/ui/primitives/use-toast';

import { SettingsHeader } from '~/components/general/settings-header';
import { appMetaTags } from '~/utils/meta';

// Phase K (overlay 045 admin UI): Stripe billing config admin page.
//
// Replaces three env vars with a DB-backed singleton + admin UI:
//   - NEXT_PRIVATE_STRIPE_API_KEY          (sandbox + live, switchable)
//   - NEXT_PRIVATE_STRIPE_WEBHOOK_SECRET   (sandbox + live, switchable)
//   - NEXT_PUBLIC_FEATURE_BILLING_ENABLED  (master toggle)
//
// Mirrors the AI config admin page pattern (apps/remix/.../admin+/ai.tsx)
// extended for two credential sets + mode-switcher + test-connection.

export function meta() {
  return appMetaTags(msg`Billing & Stripe`);
}

type CredentialForm = {
  sandboxApiKey: string;
  sandboxWebhookSecret: string;
  sandboxPublishableKey: string;
  liveApiKey: string;
  liveWebhookSecret: string;
  livePublishableKey: string;
};

type GeneralForm = {
  billingEnabled: boolean;
  statementDescriptor: string;
};

const EMPTY_CREDENTIALS: CredentialForm = {
  sandboxApiKey: '',
  sandboxWebhookSecret: '',
  sandboxPublishableKey: '',
  liveApiKey: '',
  liveWebhookSecret: '',
  livePublishableKey: '',
};

const DEFAULT_GENERAL: GeneralForm = {
  billingEnabled: false,
  statementDescriptor: '',
};

const formatRelative = (date: Date | null): string => {
  if (!date) return 'never';
  const minutes = Math.floor((Date.now() - new Date(date).getTime()) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

export default function AdminStripeConfigPage() {
  const { t } = useLingui();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const { data: existing, isLoading } = trpc.bizrethink.instanceStripe.get.useQuery();
  const updateMutation = trpc.bizrethink.instanceStripe.update.useMutation();
  const testMutation = trpc.bizrethink.instanceStripe.test.useMutation();
  const switchModeMutation = trpc.bizrethink.instanceStripe.switchMode.useMutation();
  const syncProductsMutation = trpc.bizrethink.instanceStripe.syncProducts.useMutation();

  const [general, setGeneral] = useState<GeneralForm>(DEFAULT_GENERAL);
  const [creds, setCreds] = useState<CredentialForm>(EMPTY_CREDENTIALS);

  useEffect(() => {
    if (existing) {
      setGeneral({
        billingEnabled: existing.billingEnabled,
        statementDescriptor: existing.statementDescriptor ?? '',
      });
      // Credentials always start empty — UI shows "(saved)" placeholder.
      setCreds({
        ...EMPTY_CREDENTIALS,
        sandboxPublishableKey: existing.sandboxPublishableKey ?? '',
        livePublishableKey: existing.livePublishableKey ?? '',
      });
    } else if (existing === null) {
      setGeneral(DEFAULT_GENERAL);
      setCreds(EMPTY_CREDENTIALS);
    }
  }, [existing]);

  const activeMode = existing?.mode ?? 'sandbox';
  const otherMode = activeMode === 'sandbox' ? 'live' : 'sandbox';

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({ ...general, ...creds });
      toast({ title: t`Stripe config saved` });
      // Clear secret inputs after save — UI re-renders showing "(saved)" placeholder.
      setCreds((prev) => ({
        ...EMPTY_CREDENTIALS,
        sandboxPublishableKey: prev.sandboxPublishableKey,
        livePublishableKey: prev.livePublishableKey,
      }));
      await utils.bizrethink.instanceStripe.get.invalidate();
    } catch (err) {
      toast({
        title: t`Failed to save`,
        description: err instanceof Error ? err.message : t`Unknown error`,
        variant: 'destructive',
      });
    }
  };

  const handleTest = async (mode: 'sandbox' | 'live') => {
    try {
      const result = await testMutation.mutateAsync({ mode });
      if (result.ok) {
        toast({
          title: t`Connected to Stripe`,
          description: `${result.accountId} (livemode: ${result.livemode ? 'yes' : 'no'})`,
        });
      } else {
        toast({
          title: t`Connection failed`,
          description: result.error ?? t`Unknown error`,
          variant: 'destructive',
        });
      }
      await utils.bizrethink.instanceStripe.get.invalidate();
    } catch (err) {
      toast({
        title: t`Test failed`,
        description: err instanceof Error ? err.message : t`Unknown error`,
        variant: 'destructive',
      });
    }
  };

  const handleSwitchMode = async () => {
    const confirmMsg =
      otherMode === 'live'
        ? t`Switch to LIVE mode? This routes all billing through your live Stripe account immediately.`
        : t`Switch to sandbox mode? Live subscriptions will continue billing but new checkouts will use sandbox.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await switchModeMutation.mutateAsync({ mode: otherMode });
      toast({ title: t`Switched to ${otherMode} mode` });
      await utils.bizrethink.instanceStripe.get.invalidate();
    } catch (err) {
      toast({
        title: t`Switch failed`,
        description: err instanceof Error ? err.message : t`Unknown error`,
        variant: 'destructive',
      });
    }
  };

  const handleSyncProducts = async () => {
    try {
      const result = await syncProductsMutation.mutateAsync();
      const summary = result.results
        .map((r) => `${r.tier}: ${r.created.product ? 'created' : 'verified'}`)
        .join(' · ');
      toast({ title: t`Products synced`, description: summary });
    } catch (err) {
      toast({
        title: t`Sync failed`,
        description: err instanceof Error ? err.message : t`Unknown error`,
        variant: 'destructive',
      });
    }
  };

  if (isLoading) return <SpinnerBox className="py-32" />;

  const sandboxStatus = existing?.lastTestErrorSandbox
    ? { ok: false, label: existing.lastTestErrorSandbox }
    : existing?.lastTestedSandbox
      ? { ok: true, label: `Last tested ${formatRelative(existing.lastTestedSandbox)}` }
      : { ok: null, label: 'Not tested' };

  const liveStatus = existing?.lastTestErrorLive
    ? { ok: false, label: existing.lastTestErrorLive }
    : existing?.lastTestedLive
      ? { ok: true, label: `Last tested ${formatRelative(existing.lastTestedLive)}` }
      : { ok: null, label: 'Not tested' };

  return (
    <div>
      <SettingsHeader
        title={t`Billing & Stripe`}
        subtitle={t`Stripe credentials, mode switching, and product sync. Credentials stored encrypted.`}
      />

      <div className="mt-6 max-w-3xl space-y-6">
        {/* Status card */}
        <div className="rounded-lg border p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant={activeMode === 'live' ? 'destructive' : 'secondary'}>
                  {activeMode === 'live' ? 'LIVE MODE' : 'SANDBOX MODE'}
                </Badge>
                {existing?.billingEnabled ? (
                  <Badge variant="default">Billing enabled</Badge>
                ) : (
                  <Badge variant="neutral">Billing disabled</Badge>
                )}
              </div>
              <p className="text-muted-foreground mt-2 text-sm">
                <Trans>
                  Webhook URL: <code>/api/stripe/webhook</code> — point your Stripe Dashboard ➜
                  Webhooks here.
                </Trans>
              </p>
            </div>
            {existing && (
              <Button
                variant={otherMode === 'live' ? 'destructive' : 'secondary'}
                size="sm"
                onClick={handleSwitchMode}
                loading={switchModeMutation.isPending}
              >
                <Trans>Switch to {otherMode}</Trans>
              </Button>
            )}
          </div>
        </div>

        {/* General settings */}
        <div className="space-y-4">
          <h3 className="text-base font-medium">
            <Trans>General</Trans>
          </h3>

          <div className="flex items-center gap-2">
            <Switch
              checked={general.billingEnabled}
              onCheckedChange={(v) => setGeneral({ ...general, billingEnabled: v })}
              id="billing-enabled"
            />
            <Label htmlFor="billing-enabled">
              <Trans>Billing enabled (master toggle)</Trans>
            </Label>
          </div>

          <div>
            <Label htmlFor="statement-descriptor">
              <Trans>Statement descriptor (max 22 chars)</Trans>
            </Label>
            <Input
              id="statement-descriptor"
              value={general.statementDescriptor}
              onChange={(e) =>
                setGeneral({ ...general, statementDescriptor: e.target.value.slice(0, 22) })
              }
              placeholder="PACTA*BIZRETHINK"
              maxLength={22}
            />
          </div>
        </div>

        {/* Credentials tabs */}
        <div className="space-y-4">
          <h3 className="text-base font-medium">
            <Trans>Credentials</Trans>
          </h3>

          <Tabs defaultValue="sandbox">
            <TabsList>
              <TabsTrigger value="sandbox">
                <Trans>Sandbox</Trans>
                {activeMode === 'sandbox' && <span className="ml-2 text-xs">(active)</span>}
              </TabsTrigger>
              <TabsTrigger value="live">
                <Trans>Live</Trans>
                {activeMode === 'live' && <span className="ml-2 text-xs">(active)</span>}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sandbox" className="space-y-4 pt-4">
              <Alert variant={sandboxStatus.ok === false ? 'destructive' : 'default'}>
                <AlertTitle>
                  <Trans>Sandbox status</Trans>
                </AlertTitle>
                <AlertDescription>{sandboxStatus.label}</AlertDescription>
              </Alert>

              <div>
                <Label htmlFor="sandbox-api-key">
                  <Trans>Sandbox API secret key</Trans>
                </Label>
                <Input
                  id="sandbox-api-key"
                  type="password"
                  value={creds.sandboxApiKey}
                  onChange={(e) => setCreds({ ...creds, sandboxApiKey: e.target.value })}
                  placeholder={existing?.hasSandboxApiKey ? t`sk_test_*** (saved)` : 'sk_test_...'}
                />
              </div>

              <div>
                <Label htmlFor="sandbox-webhook-secret">
                  <Trans>Sandbox webhook signing secret</Trans>
                </Label>
                <Input
                  id="sandbox-webhook-secret"
                  type="password"
                  value={creds.sandboxWebhookSecret}
                  onChange={(e) => setCreds({ ...creds, sandboxWebhookSecret: e.target.value })}
                  placeholder={
                    existing?.hasSandboxWebhookSecret ? t`whsec_*** (saved)` : 'whsec_...'
                  }
                />
              </div>

              <div>
                <Label htmlFor="sandbox-publishable-key">
                  <Trans>Sandbox publishable key</Trans>
                </Label>
                <Input
                  id="sandbox-publishable-key"
                  value={creds.sandboxPublishableKey}
                  onChange={(e) => setCreds({ ...creds, sandboxPublishableKey: e.target.value })}
                  placeholder="pk_test_..."
                />
              </div>

              <Button
                variant="secondary"
                onClick={async () => handleTest('sandbox')}
                loading={testMutation.isPending}
                disabled={!existing?.hasSandboxApiKey}
              >
                <Trans>Test sandbox connection</Trans>
              </Button>
            </TabsContent>

            <TabsContent value="live" className="space-y-4 pt-4">
              <Alert variant={liveStatus.ok === false ? 'destructive' : 'default'}>
                <AlertTitle>
                  <Trans>Live status</Trans>
                </AlertTitle>
                <AlertDescription>{liveStatus.label}</AlertDescription>
              </Alert>

              <div>
                <Label htmlFor="live-api-key">
                  <Trans>Live API secret key</Trans>
                </Label>
                <Input
                  id="live-api-key"
                  type="password"
                  value={creds.liveApiKey}
                  onChange={(e) => setCreds({ ...creds, liveApiKey: e.target.value })}
                  placeholder={existing?.hasLiveApiKey ? t`sk_live_*** (saved)` : 'sk_live_...'}
                />
              </div>

              <div>
                <Label htmlFor="live-webhook-secret">
                  <Trans>Live webhook signing secret</Trans>
                </Label>
                <Input
                  id="live-webhook-secret"
                  type="password"
                  value={creds.liveWebhookSecret}
                  onChange={(e) => setCreds({ ...creds, liveWebhookSecret: e.target.value })}
                  placeholder={existing?.hasLiveWebhookSecret ? t`whsec_*** (saved)` : 'whsec_...'}
                />
              </div>

              <div>
                <Label htmlFor="live-publishable-key">
                  <Trans>Live publishable key</Trans>
                </Label>
                <Input
                  id="live-publishable-key"
                  value={creds.livePublishableKey}
                  onChange={(e) => setCreds({ ...creds, livePublishableKey: e.target.value })}
                  placeholder="pk_live_..."
                />
              </div>

              <Button
                variant="secondary"
                onClick={async () => handleTest('live')}
                loading={testMutation.isPending}
                disabled={!existing?.hasLiveApiKey}
              >
                <Trans>Test live connection</Trans>
              </Button>
            </TabsContent>
          </Tabs>
        </div>

        {/* Products & prices */}
        <div className="space-y-4">
          <h3 className="text-base font-medium">
            <Trans>Pacta products & prices</Trans>
          </h3>
          <p className="text-muted-foreground text-sm">
            <Trans>
              Idempotently creates Pacta Pro ($35/mo · $350/yr) and Pacta Business ($199/mo ·
              $1990/yr) in the active mode's Stripe account.
            </Trans>
          </p>
          <Button
            onClick={handleSyncProducts}
            loading={syncProductsMutation.isPending}
            disabled={!existing?.hasSandboxApiKey && !existing?.hasLiveApiKey}
          >
            <Trans>Sync Pacta products to {activeMode}</Trans>
          </Button>
        </div>

        {/* Save bar — pinned at bottom of the form */}
        <div className="flex items-center gap-2 border-t pt-4">
          <Button onClick={handleSave} loading={updateMutation.isPending}>
            <Trans>Save changes</Trans>
          </Button>
          <span className="text-muted-foreground text-xs">
            <Trans>Secret inputs left blank preserve their saved values.</Trans>
          </span>
        </div>
      </div>
    </div>
  );
}
