import { AppError } from '@documenso/lib/errors/app-error';
import { Button } from '@documenso/ui/primitives/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@documenso/ui/primitives/form/form';
import { Input } from '@documenso/ui/primitives/input';
import { zodResolver } from '@hookform/resolvers/zod';
import type { MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';
import { useState } from 'react';
import { type FieldPath, useForm, useFormContext } from 'react-hook-form';

import { JURISDICTION_NAMES, MCA_JURISDICTIONS } from '../jurisdictions';
import { type McaProviderProfile, ZMcaProviderProfile } from '../templates/profile';

export const McaProviderInterview = ({
  initial,
  onSave,
  readOnly = false,
}: {
  initial?: McaProviderProfile;
  onSave: (profile: McaProviderProfile) => Promise<void>;
  readOnly?: boolean;
}) => {
  const { _ } = useLingui();
  const form = useForm<McaProviderProfile>({
    resolver: zodResolver(ZMcaProviderProfile),
    defaultValues: initial ?? emptyProfile(),
  });
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const equipment = form.watch('policy.equipment');
  const broker = form.watch('policy.brokerChannel');
  const next = async () => {
    const fields: FieldPath<McaProviderProfile>[] = step === 0 ? ['label', 'buyer'] : ['policy'];
    if (await form.trigger(fields, { shouldFocus: true })) {
      setStep(step + 1);
    }
  };
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(
          async (profile) => {
            setError(null);
            try {
              await onSave(profile);
            } catch (cause) {
              setError(AppError.parseError(cause).message);
            }
          },
          (errors) => {
            setError(_(msg`Complete the highlighted provider answers before saving.`));
            setStep(errors.label || errors.buyer ? 0 : errors.policy ? 1 : 2);
          },
        )}
        className="space-y-5"
      >
        <fieldset className="flex min-w-0 flex-wrap gap-2" aria-label={_(msg`Interview steps`)}>
          {[msg`1. Provider`, msg`2. Programme`, msg`3. Operations`].map((label, index) => (
            <Button
              key={index}
              type="button"
              variant={step === index ? 'default' : 'outline'}
              onClick={() => setStep(index)}
            >
              {_(label)}
            </Button>
          ))}
        </fieldset>
        <p className="text-muted-foreground text-sm">
          {step === 0 ? (
            <Trans>Identify the contracting entities and where notices are received.</Trans>
          ) : step === 1 ? (
            <Trans>Save the programme choices this provider supports.</Trans>
          ) : (
            <Trans>Identify processor forms and the separate equipment or channel counterparties.</Trans>
          )}
        </p>
        <fieldset
          disabled={form.formState.isSubmitting || readOnly}
          className="space-y-5 rounded-lg bg-muted/15 p-4 disabled:opacity-70 sm:p-6"
        >
          {step === 0 && (
            <>
              <h2 className="font-semibold text-xl">
                <Trans>Who provides this programme?</Trans>
              </h2>
              <TextAnswer name="label" label={msg`Template name`} />
              <EntityAnswers prefix="buyer" title={msg`Receivables buyer`} />
              <TextAnswer name="buyer.servicingPhone" label={msg`Buyer servicing phone`} />
              <TextAnswer name="buyer.reconciliationEmail" label={msg`Reconciliation email`} type="email" />
              <TextAnswer name="buyer.reconciliationAddress" label={msg`Reconciliation mailing address`} />
            </>
          )}
          {step === 1 && (
            <>
              <h2 className="font-semibold text-xl">
                <Trans>Choose the provider's programme</Trans>
              </h2>
              <p className="text-muted-foreground text-sm">
                <Trans>
                  This release supports net card receipts, collection through processor splits and merchant-state venue.
                  Choose how disputes are resolved below. Unsupported alternatives need additional drafting before use.
                </Trans>
              </p>
              <CheckAnswer
                name="policy.supportedTermsConfirmed"
                label={msg`I confirm this provider uses these supported terms`}
              />
              <SelectAnswer
                name="policy.disputeResolution"
                label={msg`Dispute resolution`}
                options={[
                  ['courts', msg`Court proceedings, with the jury, class and counterclaim waivers`],
                  ['arbitration', msg`Binding arbitration, with the authored arbitration clause`],
                ]}
              />
              <SelectAnswer
                name="policy.guarantyScope"
                label={msg`FRPA guaranty`}
                options={[
                  ['none', msg`No FRPA guaranty`],
                  ['limited-conduct', msg`Limited conduct guaranty`],
                  ['full-performance', msg`Full performance guaranty, subject to the authored loss limits`],
                ]}
              />
              <SelectAnswer
                name="policy.equipment"
                label={msg`Equipment programme`}
                options={[
                  ['none', msg`No equipment offered`],
                  ['merchant-elects', msg`Offer equipment; the merchant chooses for each deal`],
                ]}
                onChange={(value) =>
                  form.setValue(
                    'equipmentProvider',
                    value === 'none' ? null : (form.getValues('equipmentProvider') ?? emptyEntity()),
                  )
                }
              />
              <SelectAnswer
                name="policy.renewalModel"
                label={msg`Renewal treatment`}
                options={[
                  ['none', msg`No renewals`],
                  ['payoff-only', msg`Settle the prior purchase`],
                  ['carry', msg`Carry the prior position under the authored election`],
                ]}
              />
              <CheckAnswer
                name="policy.concurrentPositions"
                label={msg`Provider offers concurrent positions under the authored rules`}
              />
              <CheckAnswer
                name="policy.consumerReportPulled"
                label={msg`Provider may request individual consumer reports; each person must separately authorize a request`}
              />
              <CheckAnswer
                name="policy.brokerChannel"
                label={msg`Provider uses an ISO referral channel`}
                onChange={(value) =>
                  form.setValue(
                    'broker',
                    value
                      ? (form.getValues('broker') ?? {
                          company: emptyEntity(),
                          portalUrl: '',
                          commissionPercentage: 0,
                          fixedIsoTermsAccepted: false,
                        })
                      : null,
                  )
                }
              />
              <FormField
                control={form.control}
                name="policy.recipientStates"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Trans>States offered</Trans>
                    </FormLabel>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {MCA_JURISDICTIONS.map((state) => (
                        <label key={state} className="flex gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={field.value.includes(state)}
                            onChange={(event) =>
                              field.onChange(
                                event.target.checked
                                  ? [...field.value, state]
                                  : field.value.filter((item) => item !== state),
                              )
                            }
                          />
                          {JURISDICTION_NAMES[state]}
                        </label>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <p className="text-muted-foreground text-sm">
                <Trans>
                  Each transaction still needs a state applicability decision and any required disclosure, calculation
                  and delivery evidence.
                </Trans>
              </p>
            </>
          )}
          {step === 2 && (
            <>
              <h2 className="font-semibold text-xl">
                <Trans>Processor and separate counterparties</Trans>
              </h2>
              <p className="text-muted-foreground text-sm">
                <Trans>
                  Record the processor's required form. Acceptance and review of contradictions must be checked for each
                  transaction.
                </Trans>
              </p>
              <TextAnswer name="processor.legalName" label={msg`Processor legal name`} />
              <TextAnswer name="processor.requiredForm.title" label={msg`Required processor form title`} />
              <TextAnswer name="processor.requiredForm.version" label={msg`Processor form version`} />
              <TextAnswer
                name="processor.requiredForm.reference"
                label={msg`Form reference or controlled document location`}
              />
              {equipment !== 'none' && (
                <>
                  <EntityAnswers prefix="equipmentProvider" title={msg`Equipment contracting entity`} />
                  <TextAnswer
                    name="equipmentProvider.creditDisputeAddress"
                    label={msg`Equipment credit reporting dispute address`}
                  />
                </>
              )}
              {broker && (
                <>
                  <EntityAnswers prefix="broker.company" title={msg`ISO contracting company`} />
                  <TextAnswer name="broker.portalUrl" label={msg`Partner portal HTTPS URL`} type="url" />
                  <TextAnswer name="broker.commissionPercentage" label={msg`ISO commission percentage`} type="number" />
                  <CheckAnswer
                    name="broker.fixedIsoTermsAccepted"
                    label={msg`This company accepts the existing ISO Florida law, Pasco County arbitration and commission terms`}
                  />
                </>
              )}
            </>
          )}
        </fieldset>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          {step > 0 && (
            <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
              <Trans>Back</Trans>
            </Button>
          )}
          {step < 2 ? (
            <Button type="button" onClick={() => void next()}>
              <Trans>Continue</Trans>
            </Button>
          ) : (
            !readOnly && (
              <Button type="submit" disabled={form.formState.isSubmitting}>
                <Trans>Save template revision</Trans>
              </Button>
            )
          )}
        </div>
      </form>
    </Form>
  );
};

const TextAnswer = ({
  name,
  label,
  type = 'text',
}: {
  name: FieldPath<McaProviderProfile>;
  label: MessageDescriptor;
  type?: 'text' | 'email' | 'number' | 'url';
}) => {
  const { _ } = useLingui();
  const { control } = useFormContext<McaProviderProfile>();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{_(label)}</FormLabel>
          <FormControl>
            <Input
              type={type}
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              value={typeof field.value === 'string' || typeof field.value === 'number' ? field.value : ''}
              onChange={(event) => field.onChange(type === 'number' ? event.target.valueAsNumber : event.target.value)}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

const CheckAnswer = ({
  name,
  label,
  onChange,
}: {
  name: FieldPath<McaProviderProfile>;
  label: MessageDescriptor;
  onChange?: (value: boolean) => void;
}) => {
  const { _ } = useLingui();
  const { control } = useFormContext<McaProviderProfile>();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="flex items-start gap-2">
            <FormControl>
              <input
                type="checkbox"
                checked={field.value === true}
                name={field.name}
                ref={field.ref}
                onBlur={field.onBlur}
                onChange={(event) => {
                  field.onChange(event.target.checked);
                  onChange?.(event.target.checked);
                }}
              />
            </FormControl>
            {_(label)}
          </FormLabel>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

const SelectAnswer = ({
  name,
  label,
  options,
  onChange,
}: {
  name: FieldPath<McaProviderProfile>;
  label: MessageDescriptor;
  options: [string, MessageDescriptor][];
  onChange?: (value: string) => void;
}) => {
  const { _ } = useLingui();
  const { control } = useFormContext<McaProviderProfile>();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{_(label)}</FormLabel>
          <FormControl>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              value={String(field.value)}
              onChange={(event) => {
                field.onChange(event.target.value);
                onChange?.(event.target.value);
              }}
            >
              {options.map(([value, title]) => (
                <option key={value} value={value}>
                  {_(title)}
                </option>
              ))}
            </select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

const EntityAnswers = ({
  prefix,
  title,
}: {
  prefix: 'buyer' | 'equipmentProvider' | 'broker.company';
  title: MessageDescriptor;
}) => {
  const { _ } = useLingui();
  return (
    <section className="space-y-3 rounded-lg border p-4">
      <h3 className="font-medium">{_(title)}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {entityFields.map(([key, label, type]) => (
          <TextAnswer key={key} name={`${prefix}.${key}`} label={label} type={type} />
        ))}
      </div>
    </section>
  );
};

const entityFields = [
  ['legalName', msg`Legal name`, 'text'],
  ['entityType', msg`Entity type`, 'text'],
  ['organizationState', msg`Formation jurisdiction`, 'text'],
  ['address', msg`Principal address`, 'text'],
  ['noticeAddress', msg`Notice mailing address`, 'text'],
  ['noticeEmail', msg`Notice email`, 'email'],
] satisfies [keyof McaProviderProfile['buyer'], MessageDescriptor, 'text' | 'email'][];

const emptyEntity = () => ({
  legalName: '',
  entityType: '',
  organizationState: '',
  address: '',
  noticeAddress: '',
  noticeEmail: '',
});
const emptyProfile = (): McaProviderProfile => ({
  label: '',
  buyer: { ...emptyEntity(), reconciliationEmail: '', reconciliationAddress: '' },
  policy: {
    collectionMethod: 'split-only',
    settlementBase: 'net',
    venueRule: 'merchant-state',
    supportedTermsConfirmed: false,
    guarantyScope: 'none',
    equipment: 'none',
    renewalModel: 'none',
    concurrentPositions: false,
    disputeResolution: 'courts',
    recipientStates: [],
    brokerChannel: false,
    consumerReportPulled: false,
  },
  equipmentProvider: null,
  broker: null,
  processor: { legalName: '', requiredForm: { title: '', version: '', reference: '' } },
});
