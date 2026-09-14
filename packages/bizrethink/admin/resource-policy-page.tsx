import { AppError } from '@documenso/lib/errors/app-error';
import { trpc } from '@documenso/trpc/react';
import { Button } from '@documenso/ui/primitives/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@documenso/ui/primitives/form/form';
import { Input } from '@documenso/ui/primitives/input';
import { SpinnerBox } from '@documenso/ui/primitives/spinner';
import { useToast } from '@documenso/ui/primitives/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { DEFAULT_RESOURCE_POLICY, ZResourcePolicy } from '../resource-policy';

type Policy = z.infer<typeof ZResourcePolicy>;
export const ResourcePolicyPage = () => {
  const { t } = useLingui();
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const query = trpc.bizrethink.resourcePolicy.get.useQuery();
  const update = trpc.bizrethink.resourcePolicy.update.useMutation();
  const form = useForm<Policy>({ resolver: zodResolver(ZResourcePolicy), defaultValues: DEFAULT_RESOURCE_POLICY });
  useEffect(() => {
    if (query.data) {
      form.reset(query.data);
    }
  }, [query.data, form]);
  const fields: { name: keyof Policy; label: string; min: number; max: number }[] = [
    { name: 'trialDocuments', label: t`Documents per trial`, min: 0, max: 10000 },
    { name: 'trialEmails', label: t`Recipient emails per trial`, min: 0, max: 100000 },
    { name: 'trialRecipients', label: t`Recipients per document`, min: 1, max: 1000 },
    { name: 'trialOrganisations', label: t`Trial organisations per account`, min: 1, max: 100 },
  ];
  const save = async (policy: Policy) => {
    try {
      await update.mutateAsync(policy);
      await utils.bizrethink.resourcePolicy.get.invalidate();
      toast({ title: t`Trial limits saved` });
    } catch (error) {
      const parsed = AppError.parseError(error);
      toast({ title: t`Could not save trial limits`, description: parsed.message, variant: 'destructive' });
    }
  };
  if (query.isLoading) {
    return <SpinnerBox />;
  }
  if (query.isError) {
    return (
      <p role="alert">
        <Trans>Trial limits could not be loaded.</Trans>
      </p>
    );
  }
  return (
    <section className="max-w-2xl space-y-6">
      <div className="space-y-2">
        <h1 className="font-semibold text-2xl">
          <Trans>Trial resource limits</Trans>
        </h1>
        <p className="text-muted-foreground">
          <Trans>
            These totals apply across an account’s organisations during its 14-day external trial, including invited
            accounts. Paid subscriptions and internal organisations keep their approved limits.
          </Trans>
        </p>
        <p className="text-muted-foreground">
          <Trans>
            Templates share the document allowance. Reminders and completion emails use the recipient email allowance.
            Deleting an organisation does not renew a trial.
          </Trans>
        </p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(save)}>
          <fieldset disabled={update.isPending} className="space-y-4 disabled:opacity-60">
            {fields.map(({ name, label, min, max }) => (
              <FormField
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min={min}
                        max={max}
                        step={1}
                        onChange={(event) => field.onChange(event.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            <Button type="submit">
              <Trans>Save trial limits</Trans>
            </Button>
          </fieldset>
        </form>
      </Form>
    </section>
  );
};
