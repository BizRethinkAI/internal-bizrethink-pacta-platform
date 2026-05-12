import { useEffect, useState } from 'react';

import { msg } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';

import { useCurrentOrganisation } from '@documenso/lib/client-only/providers/organisation';
import { trpc } from '@documenso/trpc/react';
import { Button } from '@documenso/ui/primitives/button';
import { Input } from '@documenso/ui/primitives/input';
import { Label } from '@documenso/ui/primitives/label';
import { SpinnerBox } from '@documenso/ui/primitives/spinner';
import { Switch } from '@documenso/ui/primitives/switch';
import { useToast } from '@documenso/ui/primitives/use-toast';

import { SettingsHeader } from '~/components/general/settings-header';
import { appMetaTags } from '~/utils/meta';

// Phase B: per-org SMTP credentials admin UI.
//
// Lets the org admin set the SMTP credentials this organisation's outgoing
// mail authenticates with. Without a row, the env-default mailer is used.
// With a row, packages/bizrethink/server-only/per-org-mailer.ts:
// getMailerForOrg routes that org's mail through these credentials.
//
// Wired up in /o/<orgUrl>/settings/smtp; nav link added in _layout.tsx.
//
// Form behaviour:
// - Empty password field on existing config = keep existing password
// - "Test connection" button verifies SMTP without persisting
// - Save writes (encrypts password if non-empty)
// - Delete removes the row entirely (org falls back to env-default)

export function meta() {
  return appMetaTags(msg`SMTP Settings`);
}

const DEFAULT_FORM = {
  host: '',
  port: 587,
  secure: false,
  username: '',
  password: '',
  fromName: '',
  fromAddress: '',
};

export default function OrganisationSettingsSmtp() {
  const { t } = useLingui();
  const { toast } = useToast();
  const organisation = useCurrentOrganisation();

  const utils = trpc.useUtils();

  const { data: existingConfig, isLoading } = trpc.bizrethink.organisationSmtp.get.useQuery({
    organisationId: organisation.id,
  });

  const upsertMutation = trpc.bizrethink.organisationSmtp.upsert.useMutation();
  const deleteMutation = trpc.bizrethink.organisationSmtp.delete.useMutation();
  const testMutation = trpc.bizrethink.organisationSmtp.test.useMutation();

  const [form, setForm] = useState(DEFAULT_FORM);
  const [testResult, setTestResult] = useState<null | { ok: boolean; message: string }>(null);

  // Hydrate the form when the existing config loads.
  useEffect(() => {
    if (existingConfig) {
      setForm({
        host: existingConfig.host,
        port: existingConfig.port,
        secure: existingConfig.secure,
        username: existingConfig.username,
        password: '', // never returned from server; empty = keep existing
        fromName: existingConfig.fromName,
        fromAddress: existingConfig.fromAddress,
      });
    } else if (existingConfig === null) {
      setForm(DEFAULT_FORM);
    }
  }, [existingConfig]);

  const handleSave = async () => {
    try {
      await upsertMutation.mutateAsync({
        organisationId: organisation.id,
        ...form,
      });
      toast({
        title: t`SMTP settings saved`,
        description: t`This organisation's outgoing mail will now authenticate with these credentials.`,
      });
      // Clear the password field; refetch so we get fresh server state.
      setForm((prev) => ({ ...prev, password: '' }));
      await utils.bizrethink.organisationSmtp.get.invalidate();
    } catch (err) {
      toast({
        title: t`Failed to save`,
        description: err instanceof Error ? err.message : t`Unknown error`,
        variant: 'destructive',
      });
    }
  };

  const handleTest = async () => {
    if (!form.password) {
      toast({
        title: t`Password required`,
        description: t`Enter the SMTP password to run a test. The Test does not save anything.`,
        variant: 'destructive',
      });
      return;
    }

    setTestResult(null);
    const result = await testMutation.mutateAsync({
      host: form.host,
      port: form.port,
      secure: form.secure,
      username: form.username,
      password: form.password,
    });

    setTestResult(
      result.ok
        ? { ok: true, message: t`Connection succeeded.` }
        : { ok: false, message: result.error },
    );
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        t`Delete the SMTP config for this organisation? Outgoing mail will fall back to the instance default.`,
      )
    ) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({ organisationId: organisation.id });
      toast({
        title: t`SMTP config deleted`,
        description: t`This organisation now sends through the instance-default mailer.`,
      });
      setForm(DEFAULT_FORM);
      await utils.bizrethink.organisationSmtp.get.invalidate();
    } catch (err) {
      toast({
        title: t`Failed to delete`,
        description: err instanceof Error ? err.message : t`Unknown error`,
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return <SpinnerBox className="py-32" />;
  }

  const hasExistingConfig = !!existingConfig;

  return (
    <div className="max-w-2xl">
      <SettingsHeader
        title={t`SMTP Settings`}
        subtitle={t`Configure the SMTP credentials this organisation uses to send outgoing mail. Without a config, the instance default is used.`}
        docsHref="https://pacta.ink/docs/features/email-domains"
      />

      <div className="mt-6 space-y-4">
        <div>
          <Label htmlFor="host">
            <Trans>Host</Trans>
          </Label>
          <Input
            id="host"
            value={form.host}
            onChange={(e) => setForm({ ...form, host: e.target.value })}
            placeholder="smtp.postmarkapp.com"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="port">
              <Trans>Port</Trans>
            </Label>
            <Input
              id="port"
              type="number"
              value={form.port}
              onChange={(e) => setForm({ ...form, port: Number(e.target.value) })}
            />
          </div>
          <div className="flex flex-col">
            <Label htmlFor="secure" className="mb-2">
              <Trans>Secure (implicit TLS)</Trans>
            </Label>
            <div className="flex items-center gap-2">
              <Switch
                id="secure"
                checked={form.secure}
                onCheckedChange={(v) => setForm({ ...form, secure: v })}
              />
              <span className="text-muted-foreground text-xs">
                {form.secure ? t`Port 465 / TLS` : t`Port 587 / STARTTLS`}
              </span>
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="username">
            <Trans>Username</Trans>
          </Label>
          <Input
            id="username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            placeholder="Postmark server token"
          />
        </div>

        <div>
          <Label htmlFor="password">
            <Trans>Password</Trans>
          </Label>
          <Input
            id="password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder={hasExistingConfig ? t`(leave empty to keep existing)` : t`Required`}
          />
          <p className="text-muted-foreground mt-1 text-xs">
            <Trans>
              Stored encrypted using the instance encryption key. Never returned to the client.
            </Trans>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="fromName">
              <Trans>From name</Trans>
            </Label>
            <Input
              id="fromName"
              value={form.fromName}
              onChange={(e) => setForm({ ...form, fromName: e.target.value })}
              placeholder="Circular Payments Contracts"
            />
          </div>
          <div>
            <Label htmlFor="fromAddress">
              <Trans>From address</Trans>
            </Label>
            <Input
              id="fromAddress"
              type="email"
              value={form.fromAddress}
              onChange={(e) => setForm({ ...form, fromAddress: e.target.value })}
              placeholder="contracts@circularpayments.com"
            />
          </div>
        </div>

        {testResult && (
          <div
            className={`rounded-md p-3 text-sm ${
              testResult.ok ? 'bg-green-100 text-green-900' : 'bg-destructive/10 text-destructive'
            }`}
          >
            {testResult.message}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-4">
          <Button
            variant="outline"
            onClick={handleTest}
            loading={testMutation.isPending}
            disabled={!form.host || !form.username}
          >
            <Trans>Test connection</Trans>
          </Button>

          <Button
            onClick={handleSave}
            loading={upsertMutation.isPending}
            disabled={
              !form.host ||
              !form.username ||
              !form.fromName ||
              !form.fromAddress ||
              (!form.password && !hasExistingConfig)
            }
          >
            <Trans>Save</Trans>
          </Button>

          {hasExistingConfig && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              loading={deleteMutation.isPending}
              className="ml-auto"
            >
              <Trans>Delete config</Trans>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
