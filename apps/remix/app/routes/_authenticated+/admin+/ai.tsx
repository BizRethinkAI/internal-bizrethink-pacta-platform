import { trpc } from '@documenso/trpc/react';
import { Button } from '@documenso/ui/primitives/button';
import { Input } from '@documenso/ui/primitives/input';
import { Label } from '@documenso/ui/primitives/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@documenso/ui/primitives/select';
import { SpinnerBox } from '@documenso/ui/primitives/spinner';
import { Switch } from '@documenso/ui/primitives/switch';
import { useToast } from '@documenso/ui/primitives/use-toast';
import { msg } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';

import { SettingsHeader } from '~/components/general/settings-header';
import { appMetaTags } from '~/utils/meta';

/*
  Instance AI credentials.

  Added 2026-05-01 as forward scaffolding for an upstream AI feature, in a
  Vertex shape: project ID, location and API key. Simplified 2026-08-30 when
  the lease clause drafter became its first consumer — those three collected
  credentials for two different products at once, since the Gemini API takes a
  key alone while Vertex proper needs a service account, so at least two of the
  fields could never be load-bearing.

  The per-org/team `aiFeaturesEnabled` flag is upstream-managed (in
  OrganisationGlobalSettings and TeamGlobalSettings); this row supplies the
  instance-wide credentials.
*/

export function meta() {
  return appMetaTags(msg`AI Config`);
}

type FormState = {
  enabled: boolean;
  provider: 'gemini' | 'anthropic';
  apiKey: string;
};

const DEFAULT_FORM: FormState = {
  enabled: false,
  provider: 'gemini',
  apiKey: '',
};

export default function AdminAiConfigPage() {
  const { t } = useLingui();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const { data: existing, isLoading } = trpc.bizrethink.instanceAi.get.useQuery();
  const updateMutation = trpc.bizrethink.instanceAi.update.useMutation();
  const resetMutation = trpc.bizrethink.instanceAi.reset.useMutation();
  const testMutation = trpc.bizrethink.instanceAi.test.useMutation();

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  useEffect(() => {
    if (existing) {
      setForm({
        enabled: existing.enabled,
        provider: existing.provider === 'anthropic' ? 'anthropic' : 'gemini',
        // Never populated from the server; an empty box means "keep the stored key".
        apiKey: '',
      });
    } else if (existing === null) {
      setForm(DEFAULT_FORM);
    }
  }, [existing]);

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync(form);
      toast({ title: t`AI config saved` });
      setForm((prev) => ({ ...prev, apiKey: '' }));
      await utils.bizrethink.instanceAi.get.invalidate();
    } catch (err) {
      toast({
        title: t`Failed to save`,
        description: err instanceof Error ? err.message : t`Unknown error`,
        variant: 'destructive',
      });
    }
  };

  /*
    Saves first, deliberately.

    An admin who types a key and hits Test expects the key they can see to be
    the one tested. Testing the stored value instead would report a pass for a
    key they had just replaced, which is worse than having no button.
  */
  const handleTest = async () => {
    try {
      await updateMutation.mutateAsync(form);
      setForm((prev) => ({ ...prev, apiKey: '' }));
      await utils.bizrethink.instanceAi.get.invalidate();

      const result = await testMutation.mutateAsync();

      if (result.ok) {
        toast({ title: t`Connection works`, description: t`Saved, and ${result.provider ?? ''} answered.` });
      } else {
        toast({ title: t`Connection failed`, description: result.error, variant: 'destructive' });
      }
    } catch (err) {
      toast({
        title: t`Could not test the connection`,
        description: err instanceof Error ? err.message : t`Unknown error`,
        variant: 'destructive',
      });
    }
  };

  const handleReset = async () => {
    if (!window.confirm(t`Reset AI config? Falls back to environment variables.`)) {
      return;
    }
    try {
      await resetMutation.mutateAsync();
      setForm(DEFAULT_FORM);
      toast({ title: t`AI config reset` });
      await utils.bizrethink.instanceAi.get.invalidate();
    } catch (err) {
      toast({
        title: t`Failed to reset`,
        description: err instanceof Error ? err.message : t`Unknown error`,
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return <SpinnerBox className="py-32" />;
  }

  return (
    <div>
      <SettingsHeader
        title={t`AI Config`}
        subtitle={t`An API key for Gemini or Claude, used by the lease clause drafter. Stored encrypted at rest.`}
      />

      <div className="mt-6 max-w-2xl space-y-4">
        <div className="flex items-center gap-2">
          <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} id="ai-enabled" />
          <Label htmlFor="ai-enabled">
            <Trans>Enabled</Trans>
          </Label>
        </div>

        <div>
          <Label htmlFor="ai-provider">
            <Trans>Provider</Trans>
          </Label>
          <p className="mt-0.5 mb-1.5 text-muted-foreground text-xs">
            <Trans>Both authenticate with an API key alone — no cloud project or region is needed.</Trans>
          </p>
          <Select
            value={form.provider}
            onValueChange={(v) => setForm({ ...form, provider: v as FormState['provider'] })}
          >
            <SelectTrigger id="ai-provider">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gemini">Google Gemini</SelectItem>
              <SelectItem value="anthropic">Anthropic Claude</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="ai-api-key">
            <Trans>API key</Trans>
          </Label>
          <p className="mt-0.5 mb-1.5 text-muted-foreground text-xs">
            <Trans>Encrypted at rest. It is never sent back to this page once saved.</Trans>
          </p>
          <Input
            id="ai-api-key"
            type="password"
            value={form.apiKey}
            onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
            placeholder={existing?.hasApiKey ? t`(leave empty to keep)` : t`Required`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-4">
          <Button onClick={handleSave} loading={updateMutation.isPending}>
            <Trans>Save AI config</Trans>
          </Button>

          <Button
            variant="outline"
            onClick={handleTest}
            loading={testMutation.isPending || updateMutation.isPending}
            disabled={!form.apiKey && !existing?.hasApiKey}
          >
            <Trans>Save and test connection</Trans>
          </Button>
          {existing && (
            <Button variant="destructive" onClick={handleReset} loading={resetMutation.isPending} className="ml-auto">
              <Trans>Reset to env</Trans>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
