import { AppError } from '@documenso/lib/errors/app-error';
import { trpc } from '@documenso/trpc/react';
import { Button } from '@documenso/ui/primitives/button';
import { Form } from '@documenso/ui/primitives/form/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';
import { type MouseEvent, useMemo, useState } from 'react';
import { useFieldArray, useForm, useFormContext } from 'react-hook-form';
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

/**
 * THE INTERVIEW, ONE QUESTION-GROUP AT A TIME.
 *
 * Two tabs over one long scroll asked every question at once: the entity step
 * alone ran to thirteen fields, and "2. Its programme" to nine choices, a state
 * picker and a fee repeater. A person could not tell what was left, and the
 * chips said where they were and nothing else.
 *
 * Same shape as the lease builder's interview, for the same reasons — a rail
 * that carries state, and EVERY STEP REACHABLE. An interview that forces a
 * strict order is one you cannot correct a typo in without walking the whole
 * thing.
 *
 * `fields` is what the rail counts to show what still wants you. Only fields
 * the schema requires are listed: an optional one left blank is an answer, and
 * counting it would make a finished step look unfinished forever.
 */
const STEPS = [
  {
    id: 'entity',
    title: msg`Who this entity is`,
    fields: ['label', 'identity.legalName', 'identity.entityType', 'identity.organizationState', 'identity.address'],
  },
  {
    id: 'notices',
    title: msg`Notices and servicing`,
    fields: [
      'identity.noticeEmail',
      'identity.noticeAddress',
      'identity.reconciliationEmail',
      'identity.reconciliationAddress',
    ],
  },
  { id: 'online', title: msg`Online and disputes`, fields: [] },
  { id: 'supported', title: msg`What this release supports`, fields: ['policy.supportedTermsConfirmed'] },
  { id: 'venue', title: msg`Venue and disputes`, fields: ['policy.venueRule', 'policy.disputeResolution'] },
  { id: 'guaranty', title: msg`Guaranty and renewal`, fields: ['policy.guarantyScope', 'policy.renewalModel'] },
  { id: 'equipment', title: msg`Equipment and positions`, fields: ['policy.equipment', 'policy.concurrentPositions'] },
  { id: 'brokers', title: msg`Brokers and reporting`, fields: ['policy.brokerChannel', 'policy.consumerReportPulled'] },
  { id: 'states', title: msg`Where you fund`, fields: ['policy.recipientStates'] },
  { id: 'fees', title: msg`Fees`, fields: [] },
  { id: 'review', title: msg`Review`, fields: [] },
] as const;

const STEP_INDEX = Object.fromEntries(STEPS.map((step, index) => [step.id, index])) as Record<
  (typeof STEPS)[number]['id'],
  number
>;

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
    What a step still wants. `watch` rather than `formState.errors`, because
    errors only exist after a submit has been attempted and the rail has to be
    truthful before anyone presses anything.
  */
  const watched = form.watch();
  const outstandingOn = (fields: readonly string[]): number =>
    fields.filter((name) => {
      const value = name.split('.').reduce<unknown>((at, key) => (at as Record<string, unknown>)?.[key], watched);

      return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
    }).length;

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
    NEXT JUST ADVANCES, like the rail beside it.

    It used to pre-validate the first step and refuse to move. Three things
    were wrong with that. The chips already jump between steps with no
    validation, so the form contradicted itself. Submitting already validates
    everything and sends you back to the step that failed, so nothing was
    protected. And when the pre-validation misbehaved it did so in silence —
    click, and the page ignores you — which is the worst failure a form has,
    because nothing on screen looks wrong.

    An interview is a thing you move around in. It is checked when it is
    saved, which is the moment that matters.

    IT ALSO CANCELS THE CLICK — see the button row at the bottom of this form
    and #319. `setStep` runs from a discrete event, so React flushes the
    re-render while the click is still dispatching, and whatever sits under the
    pointer when the browser gets to the click's default action is what gets
    activated. Advancing a step is never a save, so say so here too rather than
    relying on the layout below staying the shape it is.
  */
  const next = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setError(null);
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
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
            /*
              GO TO THE FIRST STEP THAT ACTUALLY FAILED, rather than guessing
              between two. With eleven steps "identity or policy" is not an
              answer — a missing guaranty scope and a missing fee payee are
              both `policy` and are six steps apart.
            */
            const failed = STEPS.findIndex((entry) =>
              entry.fields.some((name) =>
                name.split('.').reduce<unknown>((at, key) => (at as Record<string, unknown>)?.[key], errors),
              ),
            );

            setStep(failed === -1 ? 0 : failed);
          },
        )}
        className="space-y-5"
      >
        <div className="grid gap-8 lg:grid-cols-[248px_minmax(0,1fr)]">
          {/*
            THE RAIL. It carries state, not just position: a step shows what is
            still unanswered on it, or a tick when nothing is. Every step stays
            reachable, because an interview that forces a strict order is one
            you cannot correct a typo in without walking the whole thing.
          */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-lg border p-4">
              <h2 className="font-semibold text-muted-foreground text-xs uppercase tracking-widest">
                <Trans>The interview</Trans>
              </h2>
              {/*
                Named, so a test — and a screen reader — can address the rail
                rather than hunting for buttons whose accessible name carries
                the step number and its outstanding count as well as its title.
              */}
              <nav className="mt-3 flex flex-col gap-0.5" aria-label={_(msg`The interview`)}>
                {STEPS.map((entry, index) => {
                  const left = outstandingOn(entry.fields);

                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => setStep(index)}
                      className={
                        index === step
                          ? 'flex items-center gap-2.5 rounded-md bg-foreground px-2 py-1.5 text-left font-medium text-background text-sm'
                          : 'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted'
                      }
                    >
                      <span className={index === step ? 'w-5 text-xs opacity-70' : 'w-5 text-muted-foreground text-xs'}>
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{_(entry.title)}</span>
                      {entry.fields.length > 0 && (
                        <span className="font-semibold text-xs">{left > 0 ? left : '✓'}</span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          <div className="min-w-0 space-y-5">
            <p className="font-semibold text-muted-foreground text-xs uppercase tracking-widest">
              <Trans>
                Step {step + 1} of {STEPS.length}
              </Trans>
            </p>
            <h2 className="font-semibold text-2xl">{_(STEPS[step].title)}</h2>

            <fieldset
              disabled={form.formState.isSubmitting || readOnly}
              className="space-y-5 rounded-lg bg-muted/15 p-4 disabled:opacity-70 sm:p-6"
            >
              {step === STEP_INDEX.entity && (
                <>
                  <h2 className="font-semibold text-xl">
                    <Trans>Which company issues these documents?</Trans>
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    <Trans>
                      This is your side of the agreement. The merchant, the guarantor, any broker and the card processor
                      all come from your platform when it sends a document — there is never a template per merchant or
                      per broker, for the same reason there is not one per deal.
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
                </>
              )}

              {step === STEP_INDEX.notices && (
                <>
                  <h2 className="font-semibold text-xl">
                    <Trans>Where does a merchant write to this entity?</Trans>
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    <Trans>
                      Two different jobs, and the documents print them separately. A notice is formal — a default, an
                      assignment, an address change. A reconciliation is a merchant asking for its money back.
                    </Trans>
                  </p>
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
                </>
              )}

              {step === STEP_INDEX.online && (
                <>
                  <h2 className="font-semibold text-xl">
                    <Trans>Where the documents point people</Trans>
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    <Trans>
                      All optional, and blank is an answer — a document simply omits what this entity does not have.
                    </Trans>
                  </p>
                  <Text name="identity.website" label={msg`Website, as your documents carry it`} type="url" />
                  <Text
                    name="identity.partnerPortalUrl"
                    label={msg`Partner portal URL`}
                    hint={msg`Where a broker signs in to see what it is owed. Printed in the channel agreement, so it is the same URL for every broker.`}
                    type="url"
                  />
                  <Text
                    name="identity.creditDisputeAddress"
                    label={msg`Credit dispute address`}
                    hint={msg`Where a customer writes to dispute what this entity reported about them.`}
                  />
                </>
              )}

              {step === STEP_INDEX.supported && (
                <>
                  <h2 className="font-semibold text-xl">
                    <Trans>How does this entity's programme run?</Trans>
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    <Trans>
                      Answered once here rather than once per document, because two documents from one programme must
                      not disagree about the guaranty. A template created against this entity copies these answers as
                      they stand at that moment — editing them later never changes a document already published.
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

                  {/*
                    THE CONFIRMATION BELONGS TO THE CONSTRAINT IT CONFIRMS.

                    It briefly did not: the step boundary landed before this
                    checkbox rather than after it, so "What this release
                    supports" stated the constraint and offered nothing to
                    agree to, while the venue step opened with a confirmation
                    of something a page earlier. Caught by the E2E, which timed
                    out waiting for a checkbox that was real and on the wrong
                    step — and it is also the answer this step's rail count is
                    counting.
                  */}
                  <Check
                    name="policy.supportedTermsConfirmed"
                    label={msg`I confirm this entity uses these supported terms`}
                  />
                </>
              )}

              {step === STEP_INDEX.venue && (
                <>
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
                            This entity offers the programme in Virginia, and Va. Code §6.2-2234(A) requires an action
                            under a covered contract to be brought there. A fixed forum of your own cannot hold
                            alongside it — either the merchant's state, or Virginia comes off the list below.
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
                </>
              )}

              {step === STEP_INDEX.guaranty && (
                <>
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
                </>
              )}

              {step === STEP_INDEX.equipment && (
                <>
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
                </>
              )}

              {step === STEP_INDEX.brokers && (
                <>
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
                </>
              )}

              {step === STEP_INDEX.states && <RecipientStates />}

              {step === STEP_INDEX.fees && (
                <>
                  <FeeSchedule />

                  {/*
                THE PAYOFF. Derived from the same `instrumentsFor` the compiler
                uses, so this cannot promise a document the builder would refuse
                to compile — and it turns a page of choices into a visible
                result before anything is saved.
              */}
                </>
              )}

              {step === STEP_INDEX.review && (
                <>
                  <h3 className="font-semibold">
                    <Trans>What this entity can issue</Trans>
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    <Trans>
                      Derived from the same selection the compiler runs, so it cannot promise a document the builder
                      would refuse to compile.
                    </Trans>
                  </p>
                  <McaDocumentsThisEntityCanHave documents={derived.data?.documents ?? []} />
                </>
              )}
            </fieldset>

            {error && (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}

            {/*
          EACH BUTTON GETS ITS OWN SLOT. Next and Save entity used to be the two
          branches of one ternary, which reads as an either/or and is not one:
          it is a single position in a single children array, so React keeps the
          host node and retypes it from `button` to `submit` in place.

          Clicking Next therefore SAVED. The state update is discrete, so React
          flushed it during the click; by the time the browser ran the click's
          default action the node under the pointer said `type="submit"` and it
          submitted the form. A saved entity is already valid, so the write
          went through, `version` moved, and the `key` on this editor —
          `${id}:${version}` — remounted it at step one. Nothing on screen
          looked wrong; the button simply appeared to do nothing (#319).

          Three conditionals are three positions, so React unmounts one button
          and mounts another instead of editing the one that was clicked.
          `packages/bizrethink/mca/__tests__/advance-button-does-not-submit.test.ts`
          keeps it that way.
        */}
            <div className="flex flex-wrap gap-2">
              {step === 1 && (
                <Button key="back" type="button" variant="outline" onClick={() => setStep(0)}>
                  <Trans>Back</Trans>
                </Button>
              )}
              {step === 0 && (
                <Button key="next" type="button" onClick={next}>
                  <Trans>Next</Trans>
                </Button>
              )}
              {step === STEPS.length - 1 && (
                <Button key="save" type="submit" disabled={form.formState.isSubmitting || readOnly}>
                  <Trans>Save entity</Trans>
                </Button>
              )}
            </div>
          </div>
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
    partnerPortalUrl: '',
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
