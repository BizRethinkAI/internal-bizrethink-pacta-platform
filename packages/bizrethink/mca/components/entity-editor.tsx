import { AppError } from '@documenso/lib/errors/app-error';
import { trpc } from '@documenso/trpc/react';
import { Button } from '@documenso/ui/primitives/button';
import { Form } from '@documenso/ui/primitives/form/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';
import { useMemo, useState } from 'react';
import { type FieldPath, useFieldArray, useForm, useFormContext } from 'react-hook-form';
import { type McaEntityInput, ZMcaEntity } from '../entities/entity';
import { JURISDICTION_NAMES, MCA_JURISDICTIONS } from '../jurisdictions';
import { CheckAnswer, SelectAnswer, TextAnswer } from './answers';
import { McaDocumentsThisEntityCanHave } from './entity-documents';
import { McaChoice, McaYesNo } from './interview-choice';

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
const Choice = McaChoice<McaEntityInput>;
const YesNo = McaYesNo<McaEntityInput>;

export const McaEntityEditor = ({
  teamId,
  initial,
  onSave,
  readOnly = false,
}: {
  teamId: number;
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
  const policy = form.watch('policy');
  const funderVenue = policy?.venueRule === 'funder-state';
  const virginia = (policy?.recipientStates ?? []).includes('US-VA');

  /*
    WHAT EACH ANSWER WOULD DO, derived server-side.

    Keyed on the policy alone, because nothing in the derivation reads an
    identity — so this refetches when an answer changes rather than when
    somebody types an address. Server-side because the clause library is
    several hundred clauses and has no business in a browser bundle.

    `keepPreviousData` so the consequences under each option do not blink out
    while the next answer is being computed; a flickering explanation is worse
    than a slightly stale one, and the staleness lasts one round trip.
  */
  /*
    THE INPUT IS MEMOISED ON ITS OWN CONTENT, not rebuilt every render.

    `form.watch` hands back a fresh object on every keystroke, so an unmemoised
    input made this refetch continuously — the consequence lists under each
    option appeared and vanished, the page never settled, and the submit button
    could not be clicked because it never stopped moving. Keyed on the
    serialised policy so it refetches when an ANSWER changes and not when
    somebody types an address.
  */
  const policyKey = JSON.stringify(policy ?? null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on the serialised value, not the identity.
  const stablePolicy = useMemo(() => policy, [policyKey]);

  const derived = trpc.bizrethink.mcaEntities.consequences.useQuery(
    { teamId, policy: stablePolicy as never },
    { enabled: Boolean(stablePolicy), retry: false, staleTime: Number.POSITIVE_INFINITY },
  );
  const consequences = derived.data?.answers ?? [];

  /*
    SAYS WHY IT CANNOT ADVANCE, rather than doing nothing.

    This used to return silently when the first step did not validate, so a
    funder with one bad field clicked Next and watched the page ignore them —
    the worst kind of form, because nothing is wrong on screen. It also made
    the failure undiagnosable from a test: "the button never appeared" and
    "the answers were rejected" look identical from the outside.
  */
  const next = async () => {
    const fields: FieldPath<McaEntityInput>[] = ['label', 'identity'];

    setError(null);

    if (await form.trigger(fields, { shouldFocus: true })) {
      setStep(1);

      return;
    }

    setError(_(msg`Complete the highlighted answers about the entity before continuing.`));
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

              {/*
                NOT A QUESTION. `collectionMethod` and `settlementBase` are
                `z.literal()` in the schema — this release supports one value
                each — so they are stated as a constraint rather than offered as
                a choice the schema would refuse.
              */}
              <div className="rounded-lg border border-dashed p-3 text-sm">
                <p className="font-medium">
                  <Trans>What this release supports</Trans>
                </p>
                <p className="text-muted-foreground">
                  <Trans>
                    Card receipts settled net, collected through a processor split. These are not choices yet —
                    alternatives need drafting before they can be offered.
                  </Trans>
                </p>
              </div>

              <Check
                name="policy.supportedTermsConfirmed"
                label={msg`I confirm this entity uses these supported terms`}
              />

              <Choice
                name="policy.venueRule"
                label={msg`Where is an action under the Agreement brought?`}
                explain={msg`Which court hears a dispute. A merchant-state rule follows the merchant; a funder-state rule fixes one forum for every deal.`}
                options={[
                  ['merchant-state', msg`The merchant's own state`],
                  ['funder-state', msg`This entity's own forum`],
                ]}
                consequences={consequences}
              />
              {funderVenue && (
                <>
                  {/*
                    A CONTRADICTION WARNED ABOUT WHERE IT IS MADE, rather than
                    reported after saving. Va. Code §6.2-2234(A) requires an
                    action under a covered contract to be brought in the
                    Commonwealth, so a funder-state forum and a Virginia
                    programme cannot both hold. The schema refuses it either
                    way; this is the same refusal, said in time to be useful.
                  */}
                  {virginia && (
                    <p role="alert" className="rounded-lg border border-destructive p-3 text-destructive text-sm">
                      <Trans>
                        This entity offers the programme in Virginia, and Va. Code §6.2-2234(A) requires an action under
                        a covered contract to be brought there. A fixed forum of your own cannot hold alongside it —
                        either the merchant's state, or Virginia comes off the list below.
                      </Trans>
                    </p>
                  )}
                  <Text name="identity.venueState" label={msg`Forum state`} />
                  <Text
                    name="identity.venueCounty"
                    label={msg`Forum county, if the courts are named by county`}
                    hint={msg`Leave empty for a state-wide forum.`}
                  />
                </>
              )}

              <Choice
                name="policy.disputeResolution"
                label={msg`How are disputes resolved?`}
                explain={msg`Whether a dispute goes to court or to an arbitrator. The two bring different clauses: one carries the jury, class and counterclaim waivers, the other the arbitration clause.`}
                options={[
                  ['courts', msg`Court proceedings`],
                  ['arbitration', msg`Binding arbitration`],
                ]}
                consequences={consequences}
              />

              <Choice
                name="policy.guarantyScope"
                label={msg`Does someone stand behind the merchant, and for how much?`}
                explain={msg`A guaranty is a person promising to answer for the business. The scope decides what they answer for — their own conduct, or the merchant's whole performance.`}
                options={[
                  ['none', msg`No guaranty is taken`],
                  ['limited-conduct', msg`Limited to the guarantor's own conduct`],
                  ['full-performance', msg`Full performance of the merchant's obligations`],
                ]}
                consequences={consequences}
              />

              <Choice
                name="policy.renewalModel"
                label={msg`Can a merchant renew before the balance is complete?`}
                explain={msg`What happens to an unfinished balance when a merchant takes new funding.`}
                options={[
                  ['none', msg`No renewals`],
                  ['payoff-only', msg`Only after the existing balance is paid off`],
                  ['carry', msg`The balance may be carried into the new agreement`],
                ]}
                consequences={consequences}
              />

              <Choice
                name="policy.equipment"
                label={msg`Does this programme place equipment?`}
                explain={msg`Point-of-sale equipment leased or subscribed alongside the advance. Choosing to place it gives this entity equipment paper of its own.`}
                options={[
                  ['none', msg`No equipment`],
                  ['merchant-elects', msg`The merchant may elect equipment`],
                ]}
                consequences={consequences}
              />

              <YesNo
                name="policy.concurrentPositions"
                label={msg`May a merchant hold another advance at the same time?`}
                explain={msg`Whether this programme allows a merchant to run a concurrent position with another funder.`}
                yes={msg`Yes, concurrent positions are allowed`}
                no={msg`No, a single active position only`}
                consequences={consequences}
              />

              <YesNo
                name="policy.brokerChannel"
                label={msg`Does this entity take business through brokers?`}
                explain={msg`Brokers come from your platform per deal — there is never a template per broker. This only decides whether this entity has a channel agreement at all.`}
                yes={msg`Yes, through ISOs and brokers`}
                no={msg`No, direct only`}
                consequences={consequences}
              />

              <YesNo
                name="policy.consumerReportPulled"
                label={msg`Does this entity pull a consumer report?`}
                explain={msg`A consumer report on an individual needs that person's written permission, which is its own document.`}
                yes={msg`Yes`}
                no={msg`No`}
                consequences={consequences}
              />

              <RecipientStates />
              <FeeSchedule />

              {/*
                THE PAYOFF. Derived from the same `instrumentsFor` the compiler
                uses, so this cannot promise a document the builder would refuse
                to compile — and it turns a page of choices into a visible
                result before anything is saved.
              */}
              <McaDocumentsThisEntityCanHave documents={derived.data?.documents ?? []} />
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
