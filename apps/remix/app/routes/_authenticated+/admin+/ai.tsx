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
import { Eye, EyeOff } from 'lucide-react';
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

  /*
    Reveals what has been TYPED, never what is stored. The saved key is
    encrypted at rest and the server only ever tells this page `hasApiKey`, so
    there is nothing to reveal for an existing key and that property is worth
    keeping — a secret that never reaches the browser cannot leak from it.

    Still useful: pasting a 100-character key and being unable to see whether
    it arrived intact is how a bad paste turns into a 401 and a wasted
    debugging session.
  */
  const [revealKey, setRevealKey] = useState(false);

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
      setRevealKey(false);
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
      setRevealKey(false);
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

  /*
    Tests what is STORED, without saving. Separate from Save-and-test on
    purpose: once a key is saved there was no way to re-check it without
    re-submitting the form, which meant an admin verifying a working config had
    to write to it first.

    Disabled while the key box has something typed in it — that text is not
    saved yet, so testing would report on the OLD key while the page shows the
    new one. Save-and-test is the button for that case.
  */
  const handleTestSaved = async () => {
    try {
      const result = await testMutation.mutateAsync();

      if (result.ok) {
        toast({ title: t`Connection works`, description: t`${result.provider ?? ''} answered.` });
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
          <div className="relative">
            <Input
              id="ai-api-key"
              type={revealKey ? 'text' : 'password'}
              className="pr-10 font-mono"
              value={form.apiKey}
              onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
              placeholder={existing?.hasApiKey ? t`(leave empty to keep)` : t`Required`}
            />

            <button
              type="button"
              className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-40"
              disabled={form.apiKey === ''}
              aria-label={revealKey ? t`Hide the key` : t`Reveal the key`}
              title={
                form.apiKey === ''
                  ? t`Nothing typed. A saved key is encrypted at rest and never sent back to this page, so it cannot be revealed.`
                  : undefined
              }
              onClick={() => setRevealKey((prev) => !prev)}
            >
              {revealKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-4">
          <Button onClick={handleSave} loading={updateMutation.isPending}>
            <Trans>Save AI config</Trans>
          </Button>

          <Button
            variant="outline"
            onClick={handleTest}
            loading={updateMutation.isPending}
            disabled={!form.apiKey && !existing?.hasApiKey}
          >
            <Trans>Save and test connection</Trans>
          </Button>

          <Button
            variant="outline"
            onClick={handleTestSaved}
            loading={testMutation.isPending}
            disabled={!existing?.hasApiKey || form.apiKey !== ''}
            title={
              form.apiKey !== ''
                ? t`You have typed a new key. Use "Save and test connection" — this button tests the saved one.`
                : undefined
            }
          >
            <Trans>Test saved connection</Trans>
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
