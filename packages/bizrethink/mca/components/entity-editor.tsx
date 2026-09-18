import { AppError } from '@documenso/lib/errors/app-error';
import { Button } from '@documenso/ui/primitives/button';
import { Form } from '@documenso/ui/primitives/form/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';
import { useState } from 'react';
import { type FieldPath, useFieldArray, useForm, useFormContext } from 'react-hook-form';

import { type McaEntityInput, ZMcaEntity } from '../entities/entity';
import { JURISDICTION_NAMES, MCA_JURISDICTIONS } from '../jurisdictions';
import { CheckAnswer, SelectAnswer, TextAnswer } from './answers';

/**
 * Adding the entity that issues a document. ADR 0026.
 *
 * TWO STEPS, because an entity answers two different kinds of question. Who it
 * is, which is a fact about a company; and how its programme runs, which
 * decides which clauses every document it issues contains. Keeping them apart
 * is not decoration — the second is the one that needs explaining, and burying
 * it under address fields is how it gets answered without being read.
 *
 * Asked ONCE here rather than once per document, which is the whole point:
 * "re-asking them every renewal is how an interview earns a reputation for
 * being tedious," as the lease's own schema puts it.
 */
const Text = TextAnswer<McaEntityInput>;
const Select = SelectAnswer<McaEntityInput>;
const Check = CheckAnswer<McaEntityInput>;

export const McaEntityEditor = ({
  initial,
  onSave,
  readOnly = false,
}: {
  initial?: McaEntityInput;
  onSave: (entity: McaEntityInput) => Promise<void>;
  readOnly?: boolean;
}) => {
  const { _ } = useLingui();
  const form = useForm<McaEntityInput>({
    resolver: zodResolver(ZMcaEntity),
    defaultValues: initial ?? emptyEntity(),
  });
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const funderVenue = form.watch('policy.venueRule') === 'funder-state';

  const next = async () => {
    const fields: FieldPath<McaEntityInput>[] = ['label', 'identity'];

    if (await form.trigger(fields, { shouldFocus: true })) {
      setStep(1);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(
          async (entity) => {
            setError(null);
            try {
              await onSave(entity);
            } catch (cause) {
              setError(AppError.parseError(cause).message);
            }
          },
          (errors) => {
            setError(_(msg`Complete the highlighted answers before saving.`));
            setStep(errors.label || errors.identity ? 0 : 1);
          },
        )}
        className="space-y-5"
      >
        <fieldset className="flex min-w-0 flex-wrap gap-2" aria-label={_(msg`Entity steps`)}>
          {[msg`1. The entity`, msg`2. Its programme`].map((label, index) => (
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
            <Trans>Who this entity is, as it appears in the documents it issues.</Trans>
          ) : (
            <Trans>How this entity's programme runs. These choices decide which clauses its documents contain.</Trans>
          )}
        </p>

        <fieldset
          disabled={form.formState.isSubmitting || readOnly}
          className="space-y-5 rounded-lg bg-muted/15 p-4 disabled:opacity-70 sm:p-6"
        >
          {step === 0 && (
            <>
              <h2 className="font-semibold text-xl">
                <Trans>Which company issues these documents?</Trans>
              </h2>
              <p className="text-muted-foreground text-sm">
                <Trans>
                  This is your side of the agreement. The merchant, the guarantor, any broker and the card processor all
                  come from your platform when it sends a document — there is never a template per merchant or per
                  broker, for the same reason there is not one per deal.
                </Trans>
              </p>
              <Text
                name="label"
                label={msg`Name for this entity in Pacta`}
                hint={msg`How you pick it out of a list. Usually the legal name — its own field because two entities can share one and you still have to tell them apart.`}
              />
              <Text name="identity.legalName" label={msg`Legal name`} />
              <Text name="identity.entityType" label={msg`Entity type, for example corporation`} />
              <Text name="identity.organizationState" label={msg`State of organisation`} />
              <Text name="identity.address" label={msg`Principal address`} />
              <Text name="identity.noticeEmail" label={msg`Notice email`} type="email" />
              <Text name="identity.noticeAddress" label={msg`Notice mailing address`} />

              <h3 className="font-semibold">
                <Trans>Servicing</Trans>
              </h3>
              <p className="text-muted-foreground text-sm">
                <Trans>Where a merchant writes or calls to ask for a reconciliation.</Trans>
              </p>
              <Text name="identity.reconciliationEmail" label={msg`Reconciliation email`} type="email" />
              <Text name="identity.reconciliationAddress" label={msg`Reconciliation mailing address`} />
              <Text name="identity.servicingPhone" label={msg`Servicing phone`} type="tel" />
              <Text name="identity.website" label={msg`Website, as your documents carry it`} type="url" />
              <Text
                name="identity.creditDisputeAddress"
                label={msg`Credit dispute address`}
                hint={msg`Where a customer writes to dispute what this entity reported about them.`}
              />
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="font-semibold text-xl">
                <Trans>How does this entity's programme run?</Trans>
              </h2>
              <p className="text-muted-foreground text-sm">
                <Trans>
                  Answered once here rather than once per document, because two documents from one programme must not
                  disagree about the guaranty. A template created against this entity copies these answers as they stand
                  at that moment — editing them later never changes a document already published.
                </Trans>
              </p>

              <Check
                name="policy.supportedTermsConfirmed"
                label={msg`I confirm this entity uses these supported terms`}
                hint={msg`This release supports net card receipts collected through processor splits. Unsupported alternatives need drafting before use.`}
              />

              <Select
                name="policy.venueRule"
                label={msg`Where an action under the Agreement is brought`}
                options={[
                  ['merchant-state', msg`The merchant's own state`],
                  ['funder-state', msg`This entity's own forum`],
                ]}
              />
              {funderVenue && (
                <>
                  <Text name="identity.venueState" label={msg`Forum state`} />
                  <Text
                    name="identity.venueCounty"
                    label={msg`Forum county, if the courts are named by county`}
                    hint={msg`Leave empty for a state-wide forum.`}
                  />
                </>
              )}

              <Select
                name="policy.disputeResolution"
                label={msg`Dispute resolution`}
                options={[
                  ['courts', msg`Court proceedings, with the jury, class and counterclaim waivers`],
                  ['arbitration', msg`Binding arbitration, with the authored arbitration clause`],
                ]}
              />
              <Select
                name="policy.guarantyScope"
                label={msg`Guaranty`}
                options={[
                  ['none', msg`No guaranty is taken`],
                  ['limited-conduct', msg`Limited to the guarantor's own conduct`],
                  ['full-performance', msg`Full performance of the merchant's obligations`],
                ]}
              />
              <Select
                name="policy.renewalModel"
                label={msg`Renewals`}
                options={[
                  ['none', msg`No renewals`],
                  ['payoff-only', msg`Payoff of the existing balance only`],
                  ['carry', msg`The balance may be carried into the new agreement`],
                ]}
              />
              <Select
                name="policy.equipment"
                label={msg`Equipment`}
                options={[
                  ['none', msg`This programme places no equipment`],
                  ['merchant-elects', msg`The merchant may elect equipment`],
                ]}
              />
              <Check name="policy.concurrentPositions" label={msg`Merchants may hold concurrent positions`} />
              <Check
                name="policy.brokerChannel"
                label={msg`This entity takes business through brokers`}
                hint={msg`Brokers come from your platform per deal — this only decides whether the channel agreement exists as a template.`}
              />
              <Check
                name="policy.consumerReportPulled"
                label={msg`This entity pulls a consumer report`}
                hint={msg`A separate permission document covers it.`}
              />

              <RecipientStates />
              <FeeSchedule />
            </>
          )}
        </fieldset>

        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {step === 1 && (
            <Button type="button" variant="outline" onClick={() => setStep(0)}>
              <Trans>Back</Trans>
            </Button>
          )}
          {step === 0 ? (
            <Button type="button" onClick={next}>
              <Trans>Next</Trans>
            </Button>
          ) : (
            <Button type="submit" disabled={form.formState.isSubmitting || readOnly}>
              <Trans>Save entity</Trans>
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
};

/**
 * Where this entity offers its programme.
 *
 * It decides which state disclosures a document has to carry, so it is a
 * programme answer rather than a deal one — and an empty list is a complete
 * answer meaning "nowhere yet", not a missing one.
 */
const RecipientStates = () => {
  const { watch, setValue } = useFormContext<McaEntityInput>();
  const selected = watch('policy.recipientStates') ?? [];

  return (
    <section className="space-y-2 rounded-lg border p-4">
      <h3 className="font-semibold">
        <Trans>States where this entity offers the programme</Trans>
      </h3>
      <p className="text-muted-foreground text-sm">
        <Trans>Each one decides which disclosures its documents carry. Leave empty if none are live yet.</Trans>
      </p>
      <div className="flex flex-wrap gap-2">
        {MCA_JURISDICTIONS.map((jurisdiction) => {
          const on = selected.includes(jurisdiction);

          return (
            <Button
              key={jurisdiction}
              type="button"
              variant={on ? 'default' : 'outline'}
              onClick={() =>
                setValue(
                  'policy.recipientStates',
                  on ? selected.filter((each) => each !== jurisdiction) : [...selected, jurisdiction],
                  { shouldDirty: true, shouldValidate: true },
                )
              }
            >
              {JURISDICTION_NAMES[jurisdiction] ?? jurisdiction}
            </Button>
          );
        })}
      </div>
    </section>
  );
};

/**
 * The entity's own fees, in the terms the Appendix clause requires.
 *
 * `frpa.appendix-a-fees-collectible` permits only a fee the completed Appendix
 * identifies by name, amount or calculation method, payee, purpose and timing,
 * and reads anything unlisted as $0.00. Leaving this empty is therefore a
 * complete answer: the entity charges nothing.
 */
const FeeSchedule = () => {
  const { control } = useFormContext<McaEntityInput>();
  const { fields, append, remove } = useFieldArray({ control, name: 'policy.fees' });

  return (
    <section className="space-y-3 rounded-lg border p-4">
      <h3 className="font-semibold">
        <Trans>Permitted fees (Appendix A)</Trans>
      </h3>
      <p className="text-muted-foreground text-sm">
        <Trans>
          A fee this Appendix does not identify is $0.00 and cannot be charged. State each fee by name, what it costs,
          who is paid, what it is for and when it is charged. An entity that charges no fee leaves this empty.
        </Trans>
      </p>
      {fields.map((entry, index) => (
        <FeeRow key={entry.id} index={index} onRemove={() => remove(index)} />
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() => append({ basis: 'amount', name: '', amount: '', payee: '', purpose: '', when: '' })}
      >
        <Trans>Add a fee</Trans>
      </Button>
    </section>
  );
};

/**
 * One fee.
 *
 * `ZMcaFee` is a discriminated union: a fee states a dollar amount **or** a
 * calculation method, never both. Rendering both boxes would invite a funder to
 * fill in two and have one silently dropped, so the basis chooses which is
 * asked.
 */
const FeeRow = ({ index, onRemove }: { index: number; onRemove: () => void }) => {
  const { watch } = useFormContext<McaEntityInput>();
  const basis = watch(`policy.fees.${index}.basis`);

  return (
    <fieldset className="space-y-3 rounded border p-3">
      <legend className="text-sm">
        <Trans>Fee {index + 1}</Trans>
      </legend>
      <Text name={`policy.fees.${index}.name`} label={msg`Fee name`} />
      <Select
        name={`policy.fees.${index}.basis`}
        label={msg`Stated as`}
        options={[
          ['amount', msg`A dollar amount`],
          ['method', msg`A calculation method`],
        ]}
      />
      {basis === 'method' ? (
        <Text name={`policy.fees.${index}.method`} label={msg`Calculation method`} />
      ) : (
        <Text name={`policy.fees.${index}.amount`} label={msg`Dollar amount, for example 500.00`} />
      )}
      <Text name={`policy.fees.${index}.payee`} label={msg`Who is paid`} />
      <Text name={`policy.fees.${index}.purpose`} label={msg`What it is for`} />
      <Text name={`policy.fees.${index}.when`} label={msg`When it is charged`} />
      <Button type="button" variant="outline" onClick={onRemove}>
        <Trans>Remove this fee</Trans>
      </Button>
    </fieldset>
  );
};

/**
 * A blank entity. Every choice starts at the conservative option rather than a
 * convenient one: no guaranty, no renewals, no equipment, no broker channel and
 * nowhere offered. A default that quietly took a guaranty would be a term a
 * funder never chose.
 */
const emptyEntity = (): McaEntityInput => ({
  label: '',
  identity: {
    legalName: '',
    entityType: '',
    organizationState: '',
    address: '',
    noticeEmail: '',
    noticeAddress: '',
    reconciliationEmail: '',
    reconciliationAddress: '',
    servicingPhone: '',
    venueState: '',
    venueCounty: '',
    website: '',
    creditDisputeAddress: '',
  },
  policy: {
    collectionMethod: 'split-only',
    settlementBase: 'net',
    venueRule: 'merchant-state',
    disputeResolution: 'courts',
    guarantyScope: 'none',
    renewalModel: 'none',
    concurrentPositions: false,
    equipment: 'none',
    brokerChannel: false,
    consumerReportPulled: false,
    supportedTermsConfirmed: false,
    recipientStates: [],
    fees: [],
  },
});
