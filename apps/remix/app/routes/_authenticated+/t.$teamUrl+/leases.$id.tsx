import { FL_LIBRARY } from '@bizrethink/customizations/lease/clauses/us-fl';
import { selectClauses } from '@bizrethink/customizations/lease/engine/select-clauses';
import { clauseIndexForFields } from '@bizrethink/customizations/lease/interview/clause-for-field';
import {
  describeMissingUnique,
  outstandingDelegations,
} from '@bizrethink/customizations/lease/interview/describe-missing';
import type { InterviewAnswers } from '@bizrethink/customizations/lease/interview/steps';
import { FL_INTERVIEW, visibleSteps } from '@bizrethink/customizations/lease/interview/steps';
import { delegableFieldNames } from '@bizrethink/customizations/lease/interview/tenant-answers';
import type { LeasePartyInput } from '@bizrethink/customizations/lease/parties/derive-parties';
import type { UtilityRow } from '@bizrethink/customizations/lease/utilities/derive-utilities';
import { canAccessLeaseBuilder } from '@bizrethink/customizations/server-only/feature-access';
import { getSession } from '@documenso/auth/server/lib/utils/get-session';
import { getTeamByUrl } from '@documenso/lib/server-only/team/get-team';
import { prisma } from '@documenso/prisma';
import { trpc } from '@documenso/trpc/react';
import { Alert, AlertDescription, AlertTitle } from '@documenso/ui/primitives/alert';
import { Button } from '@documenso/ui/primitives/button';
import { msg } from '@lingui/core/macro';
import { AlertTriangle, ArrowLeft, ArrowRight, Check, FileText, Loader2, MessageSquarePlus, Send } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLoaderData, useRevalidator } from 'react-router';
import { CustomClauseEditor } from '~/components/general/lease/custom-clause-editor';
import type { FieldValue } from '~/components/general/lease/interview-field';
import { InterviewFieldControl, LB_ACCENT_TEXT, LB_ACTION_TEXT } from '~/components/general/lease/interview-field';
import { PartyEditor } from '~/components/general/lease/party-editor';
import { LeaseReviewPanel } from '~/components/general/lease/review-panel';
import { UtilitySummary } from '~/components/general/lease/utility-summary';
import { YardTaskEditor } from '~/components/general/lease/yard-task-editor';
import { appMetaTags } from '~/utils/meta';

import type { Route } from './+types/leases.$id';

/**
 * The lease interview.
 *
 * Steps and fields come from the interview definition, not from this file —
 * a test asserts that definition covers every variable the 47 clauses can
 * interpolate, so a question can never be quietly missing while the lease
 * renders a raw {{token}}.
 *
 * Progress saves on every step change. A 68-field interview that loses work on
 * a refresh is one nobody finishes.
 */

export function meta() {
  return appMetaTags(msg`Lease Builder`);
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { teamUrl, id } = params;

  if (!teamUrl || !id) {
    throw new Response('Not Found', { status: 404 });
  }

  const { user } = await getSession(request);
  const team = await getTeamByUrl({ userId: user.id, teamUrl });

  if (!(await canAccessLeaseBuilder({ organisationId: team.organisationId, userId: user.id }))) {
    throw new Response('Not Found', { status: 404 });
  }

  const matter = await prisma.bizrethinkLeaseMatter.findFirst({
    where: { id, organisationId: team.organisationId },
  });

  if (!matter) {
    throw new Response('Not Found', { status: 404 });
  }

  /*
    The utility rows live on the property and are read live rather than copied
    into the matter. Fetched here so step 4 can SHOW what the lease will say —
    deriving an answer is not a reason to hide it.
  */
  const property = await prisma.bizrethinkProperty.findUnique({
    where: { id: matter.propertyId },
    select: { utilities: true },
  });

  return {
    teamUrl,
    organisationId: team.organisationId,
    utilities: (property?.utilities ?? []) as UtilityRow[],
    matter: {
      id: matter.id,
      title: matter.title,
      status: matter.status,
      currentStepId: matter.currentStepId,
      facts: matter.facts as Record<string, FieldValue>,
      money: matter.money as Record<string, unknown>,
      values: matter.values as Record<string, FieldValue>,
      customClauses: matter.customClauses as InterviewAnswers['customClauses'],
      yardTasks: matter.yardTasks as InterviewAnswers['yardTasks'],
      parties: matter.parties as LeasePartyInput[],
      delegatedFields: (matter.delegatedFields ?? []) as string[],
      envelopeId: matter.envelopeId,
      // Carried into every save so a write built on a stale read is refused
      // rather than silently overwriting a tenant's returned answers.
      updatedAt: matter.updatedAt.toISOString(),
    },
  };
}

/** Money answers are nested; facts and values are flat. */
const readMoney = (money: Record<string, unknown>, name: string): FieldValue => {
  const rent = (money.rent ?? {}) as Record<string, FieldValue>;
  const term = (money.term ?? {}) as Record<string, FieldValue>;
  const deposit = (money.deposit ?? {}) as Record<string, FieldValue>;

  if (name in rent) {
    return rent[name];
  }
  if (name in term) {
    return term[name];
  }
  if (name in deposit) {
    return deposit[name];
  }

  return (money[name] as FieldValue) ?? null;
};

const writeMoney = (money: Record<string, unknown>, name: string, value: FieldValue) => {
  const next = structuredClone(money);
  const rent = (next.rent ?? {}) as Record<string, FieldValue>;
  const term = (next.term ?? {}) as Record<string, FieldValue>;
  const deposit = (next.deposit ?? {}) as Record<string, FieldValue>;

  if (name in rent) {
    rent[name] = value;
  } else if (name in term) {
    term[name] = value;
  } else if (name in deposit) {
    deposit[name] = value;
  } else {
    next[name] = value;
  }

  return next;
};

export default function LeaseInterviewPage() {
  const { teamUrl, organisationId, matter, utilities } = useLoaderData<typeof loader>();

  const [facts, setFacts] = useState<Record<string, FieldValue>>(matter.facts);
  const [money, setMoney] = useState<Record<string, unknown>>(matter.money);
  const [values, setValues] = useState<Record<string, FieldValue>>(matter.values);
  const [customClauses, setCustomClauses] = useState<InterviewAnswers['customClauses']>(matter.customClauses);
  const [yardTasks, setYardTasks] = useState<InterviewAnswers['yardTasks']>(matter.yardTasks ?? []);
  const [parties, setParties] = useState<LeasePartyInput[]>(matter.parties);
  const [delegatedFields, setDelegatedFields] = useState<string[]>(matter.delegatedFields);

  /*
    The row's `updatedAt` as this page last saw it, advanced by each successful
    save. Without carrying the new value forward the second save of a session
    would always look stale to the server.
  */
  const [seenUpdatedAt, setSeenUpdatedAt] = useState(matter.updatedAt);

  /*
    A failed save used to be completely invisible: the error was rendered
    nowhere, and `goTo` awaited the mutation with no catch while every caller
    was `void goTo(...)`. The page simply did not move, an unhandled rejection
    went to the console, and the caption underneath still said progress saves
    as you move between steps.
  */
  const [saveError, setSaveError] = useState<string | null>(null);

  // Which fields may be put to the tenant at all. Server-side this is
  // recomputed from the same definitions, so the UI cannot widen it.
  const delegable = useMemo(() => new Set(delegableFieldNames(FL_INTERVIEW)), []);

  const answers = useMemo(
    () => ({ facts, money, values, customClauses, parties, yardTasks }) as unknown as InterviewAnswers,
    [facts, money, values, customClauses, parties, yardTasks],
  );

  const steps = useMemo(() => visibleSteps(FL_INTERVIEW, answers), [answers]);

  const [stepIndex, setStepIndex] = useState(() => {
    const saved = steps.findIndex((s) => s.id === matter.currentStepId);

    return saved >= 0 ? saved : 0;
  });

  // Steps appear and disappear as answers change, so an index can fall off the
  // end — say the pet step vanishes while you are standing on it.
  const safeIndex = Math.min(stepIndex, steps.length - 1);
  const step = steps[safeIndex];

  const saveStep = trpc.bizrethink.leaseBuilder.matter.saveStep.useMutation();
  const validate = trpc.bizrethink.leaseBuilder.matter.validate.useQuery(
    { id: matter.id },
    { enabled: step?.id === 'review' },
  );

  const setField = (target: 'fact' | 'money' | 'value', name: string, value: FieldValue) => {
    if (target === 'fact') {
      setFacts((prev) => ({ ...prev, [name]: value }));
    } else if (target === 'money') {
      setMoney((prev) => writeMoney(prev, name, value));
    } else {
      setValues((prev) => ({ ...prev, [name]: value }));
    }
  };

  const goTo = async (index: number) => {
    const target = steps[Math.max(0, Math.min(index, steps.length - 1))];

    try {
      const { updatedAt } = await saveStep.mutateAsync({
        id: matter.id,
        currentStepId: target.id,
        answers: { facts, money, values, customClauses, parties, yardTasks } as never,
        delegatedFields,
        expectedUpdatedAt: seenUpdatedAt,
      });

      setSeenUpdatedAt(updatedAt);
      setSaveError(null);
    } catch (error) {
      /*
        The step deliberately does NOT advance. Moving on from a step whose
        answers were not stored is how a 68-field interview quietly stops
        persisting — which is exactly what happened before, in silence.
      */
      setSaveError(error instanceof Error ? error.message : 'Your answers could not be saved.');

      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0 });
      }

      return;
    }

    setStepIndex(index);

    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0 });
    }
  };

  if (!step) {
    return null;
  }

  const visibleFields = step.fields.filter((f) => f.showWhen === undefined || f.showWhen(answers));

  /*
    Which clause each answer ends up in, for THIS lease. Numbering is derived
    from what survives selection, so it is recomputed as the answers change
    rather than read off the library once.
  */
  const clauseFor = clauseIndexForFields(selectClauses({ facts: facts as never, library: FL_LIBRARY }).selected);

  /*
    How much of a step is still outstanding, so the rail can say so. Counts
    only REQUIRED fields that are VISIBLE — an optional blank is an answer, and
    a hidden field is not being asked.
  */
  const outstandingOn = (candidate: (typeof steps)[number]) =>
    candidate.fields.filter((f) => {
      if (f.required !== true) {
        return false;
      }

      if (f.showWhen !== undefined && !f.showWhen(answers)) {
        return false;
      }

      const held =
        f.target === 'fact' ? facts[f.name] : f.target === 'money' ? readMoney(money, f.name) : values[f.name];

      return held === null || held === undefined || String(held).trim() === '';
    }).length;

  return (
    <div className="mx-auto w-full max-w-screen-xl px-4 pb-24 md:px-8">
      <div className="mt-8 border-b pb-5">
        <h1 className="font-semibold text-2xl">{matter.title}</h1>
        <p className="mt-1 text-muted-foreground text-sm">Draft · progress saves as you move between steps</p>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-12">
        {/*
          THE RAIL. Thirteen chips wrapping over two rows showed where you were
          and nothing else — not what was finished, not what still wanted you.
          A list carries state.

          Every step stays reachable. An interview that forces a strict order is
          one you cannot correct a typo in without walking the whole thing.
        */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-lg border p-4">
            <h2 className="font-semibold text-muted-foreground text-xs uppercase tracking-widest">The interview</h2>

            <nav className="mt-3 flex flex-col gap-0.5">
              {steps.map((s, i) => {
                const left = outstandingOn(s);

                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => void goTo(i)}
                    className={
                      i === safeIndex
                        ? 'flex items-center gap-2.5 rounded-md bg-foreground px-2 py-1.5 text-left font-medium text-background text-sm'
                        : 'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted'
                    }
                  >
                    <span className={i === safeIndex ? 'w-5 text-xs opacity-70' : 'w-5 text-muted-foreground text-xs'}>
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{s.title}</span>
                    {s.id !== 'review' && (
                      <span
                        className={
                          i === safeIndex
                            ? 'font-semibold text-xs'
                            : left > 0
                              ? `${LB_ACTION_TEXT} font-semibold text-xs`
                              : `${LB_ACCENT_TEXT} font-semibold text-xs`
                        }
                      >
                        {left > 0 ? left : '✓'}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="mt-4 rounded-lg border p-4">
            <h2 className="font-semibold text-muted-foreground text-xs uppercase tracking-widest">The document</h2>
            <p className="mt-2 text-muted-foreground text-xs">
              Everything the answers have selected so far, as one file.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <a href={`/t/${teamUrl}/leases/${matter.id}/preview`} target="_blank" rel="noreferrer">
                <FileText className="mr-2 h-4 w-4" />
                Preview the lease
              </a>
            </Button>
          </div>
        </aside>

        <div className="min-w-0">
          <section>
            <p className={`${LB_ACCENT_TEXT} font-semibold text-xs uppercase tracking-widest`}>
              Step {safeIndex + 1} of {steps.length}
            </p>
            <h2 className="mt-1.5 font-semibold text-2xl">{step.title}</h2>
            {step.intro && <p className="mt-2 max-w-2xl text-muted-foreground leading-relaxed">{step.intro}</p>}

            {/*
          Above the fields on this step, not below them. The step now opens the
          interview and the party list is the question it is asking; leaving it
          under half a dozen notice questions is what made it easy to miss.
        */}
            {step.id === 'parties' && <PartyEditor parties={parties} onChange={setParties} />}

            <div className="mt-4">
              {visibleFields.map((field) => (
                <InterviewFieldControl
                  key={field.name}
                  field={field}
                  value={
                    field.target === 'fact'
                      ? (facts[field.name] ?? null)
                      : field.target === 'money'
                        ? readMoney(money, field.name)
                        : (values[field.name] ?? null)
                  }
                  onChange={(value) => setField(field.target, field.name, value)}
                  organisationId={organisationId}
                  clause={clauseFor.get(field.name)}
                  delegation={
                    delegable.has(field.name)
                      ? {
                          asked: delegatedFields.includes(field.name),
                          onToggle: (asked) =>
                            setDelegatedFields((prev) =>
                              asked ? [...new Set([...prev, field.name])] : prev.filter((name) => name !== field.name),
                            ),
                        }
                      : undefined
                  }
                />
              ))}
            </div>

            {/*
          Below the repair threshold rather than above it. The threshold is a
          statutory question and this is a negotiated one; and unlike the
          threshold, this section is offered on every property type — Florida
          constrains who may be made to fix the plumbing, not who cuts the
          grass.
        */}
            {step.id === 'utilities' && (
              <UtilitySummary utilities={utilities} propertiesHref={`/t/${teamUrl}/leases`} />
            )}

            {step.id === 'maintenance' && <YardTaskEditor tasks={yardTasks} onChange={setYardTasks} />}

            {step.id === 'custom-clauses' && (
              <CustomClauseEditor
                sections={step.customClauseSections ?? []}
                clauses={customClauses}
                onChange={setCustomClauses}
                organisationId={organisationId}
              />
            )}

            {step.id === 'review' && (
              <ReviewPanel
                teamUrl={teamUrl}
                matterId={matter.id}
                status={matter.status}
                envelopeId={matter.envelopeId}
                parties={parties}
                delegatedFields={delegatedFields}
                values={values}
                query={{ isLoading: validate.isLoading, data: validate.data as ValidationResult | undefined }}
              />
            )}
          </section>
        </div>
      </div>

      {/*
        A failed save was rendered nowhere at all. The page did not move, the
        rejection went to the console unhandled, and the caption below still
        promised that progress saves as you move between steps.
      */}
      {saveError !== null && (
        <Alert variant="destructive" className="mt-8">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Your answers were not saved</AlertTitle>
          <AlertDescription>
            <p className="text-sm">{saveError}</p>
            {/*
              A full reload, not `revalidator.revalidate()`. Every answer is
              seeded into React state once at mount and nothing resyncs it —
              which is the defect this alert exists to report — so re-running
              the loader would leave exactly the stale copy that was refused.
            */}
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.reload();
                }
              }}
            >
              Reload this lease
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="fixed inset-x-0 bottom-0 z-10 border-t bg-background/95 px-4 py-3 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-screen-xl items-center gap-4">
          <Button variant="outline" size="sm" disabled={safeIndex === 0} onClick={() => void goTo(safeIndex - 1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <span className="text-muted-foreground text-xs">
            {saveStep.isPending
              ? 'Saving…'
              : outstandingOn(step) > 0
                ? `${outstandingOn(step)} answer${outstandingOn(step) === 1 ? '' : 's'} still needed on this step`
                : 'Everything on this step is answered'}
          </span>

          <div className="ml-auto flex items-center gap-3">
            <Button disabled={safeIndex === steps.length - 1} onClick={() => void goTo(safeIndex + 1)}>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * What `matter.validate` returns.
 *
 * Written out rather than inferred: `ReturnType<typeof …useQuery>` does not
 * carry the procedure's output type through, so `query.data` widens to `{}`
 * and every read off it becomes an error — or worse, an implicit `any` that
 * compiles and breaks at runtime.
 */
type ValidationResult = {
  findings: { code: string; severity: 'blocks' | 'warns'; citation: string; message: string }[];
  missing: string[];
  partyFindings: string[];
  yardFindings: string[];
  reviewFindings: string[];
  clauseFindings: {
    ruleId: string;
    citation: string;
    clauseHeading: string;
    severity: 'blocks' | 'warns';
    statute: string;
    message: string;
    matched: string[];
  }[];
  duplicateAssertions: { assertion: string; slugs: string[] }[];
  unreviewedClauses: string[];
  blocking: number;
  readyToSend: boolean;
  rulePackVersion: number;
};

/**
 * The review step. Three kinds of problem, kept apart because each is resolved
 * differently: a statutory limit by changing an answer, an unfilled variable by
 * answering a question, an unreviewed clause by an attorney.
 */
const ReviewPanel = ({
  teamUrl,
  matterId,
  status,
  envelopeId,
  parties,
  delegatedFields,
  values,
  query,
}: {
  teamUrl: string;
  matterId: string;
  status: string;
  envelopeId: string | null;
  parties: LeasePartyInput[];
  /** So a question put to the tenant is not reported as one the landlord skipped. */
  delegatedFields: string[];
  /** To tell a delegated question that came back from one that did not. */
  values: Record<string, FieldValue>;
  query: { isLoading: boolean; data: ValidationResult | undefined };
}) => {
  const revalidator = useRevalidator();
  const [confirming, setConfirming] = useState(false);

  const send = trpc.bizrethink.leaseBuilder.matter.send.useMutation({
    onSuccess: () => {
      setConfirming(false);
      revalidator.revalidate();
    },
  });
  if (query.isLoading) {
    return (
      <p className="mt-6 flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking the lease against Florida law…
      </p>
    );
  }

  /*
    A sent lease is done being edited here. Showing the findings panel again
    would invite changes to a document that recipients are already signing —
    the answers would drift from the PDF in their inbox with nothing to
    reconcile the two.
  */
  if (status !== 'draft' || envelopeId) {
    return (
      <div className="mt-6 space-y-4">
        <Alert>
          <Check className="h-4 w-4" />
          <AlertTitle>This lease has been sent for signature</AlertTitle>
          <AlertDescription>
            Every signer has been emailed their own link. The lease can no longer be edited here — track it from the
            documents list.
          </AlertDescription>
        </Alert>

        {envelopeId && (
          <Button asChild variant="outline">
            <a href={`/t/${teamUrl}/documents/${envelopeId}`}>Open the envelope</a>
          </Button>
        )}
      </div>
    );
  }

  /*
    VALIDATION FAILING MUST NOT HIDE THE PAGE.

    This used to `return null` when the query produced no data, which meant a
    single failing request blanked the entire review step — no findings, no
    "send for review", no Send button, and no explanation. Sending a lease to
    a lawyer is precisely what you would want to do when something is wrong
    with it, so that path cannot be gated on the checks succeeding.
  */
  const data = query.data;

  return (
    <div className="mt-6 space-y-4">
      {!data && (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>The checks could not be run</AlertTitle>
          <AlertDescription>
            Nothing has been validated against Florida law, so nothing below says whether this lease is ready. You can
            still preview it and send it for review. Reload to try the checks again.
          </AlertDescription>
        </Alert>
      )}

      {data?.findings.map((finding) => (
        <Alert key={finding.code} variant={finding.severity === 'blocks' ? 'destructive' : 'warning'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{finding.citation}</AlertTitle>
          <AlertDescription>{finding.message}</AlertDescription>
        </Alert>
      ))}

      {/*
        The QUESTION, not the clause slug and variable name the renderer emits.
        This printed `parties.recital: effectiveDate` in monospace — the
        landlord could not tell which question they had skipped, and in that
        particular case there was none, so no answer of theirs would ever have
        cleared it.
      */}
      {(data?.missing.length ?? 0) > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {describeMissingUnique(data?.missing ?? [], delegatedFields).length} answers still outstanding
          </AlertTitle>
          <AlertDescription>
            <ul className="mt-2 space-y-2 pl-4">
              {describeMissingUnique(data?.missing ?? [], delegatedFields).map((entry) => (
                <li key={entry.raw} className="list-disc text-sm">
                  {entry.question}
                  {/*
                    The step TITLE, not a number. Which steps are visible
                    depends on the answers, so a number computed here goes
                    stale and sends someone to the wrong page.
                  */}
                  {/*
                    A delegated question still blocks — a lease cannot go out
                    with a raw token in it — but it is not one the landlord
                    skipped, and a red list that cannot tell the two apart
                    sends them to answer what they have already dealt with.
                  */}
                  {entry.stepTitle !== null && (
                    <span className="block text-muted-foreground text-xs">
                      {entry.awaitingTenant
                        ? `${entry.stepTitle} · asked of the tenant, not yet answered`
                        : entry.stepTitle}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {(data?.partyFindings.length ?? 0) > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>The signer list needs attention</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
              {data?.partyFindings.map((finding) => (
                <li key={finding}>{finding}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/*
        Shown, not merely counted. This was computed and discarded, so an
        organisation without the draft-rendering grant saw "nothing blocking",
        pressed Send, and got a hard failure naming raw clause slugs.
      */}
      {/*
        NOT blocking, and deliberately outside the red list. A delegated
        question only reaches `missing` when it is also a required clause
        variable — occupants is not, because blank there is a lawful answer
        that selects a different clause. Without this the landlord asks, never
        hears back, and finds out from the rendered lease.
      */}
      {outstandingDelegations(delegatedFields, values).length > 0 && (
        <Alert>
          <MessageSquarePlus className="h-4 w-4" />
          <AlertTitle>Waiting on the tenant</AlertTitle>
          <AlertDescription>
            <p className="text-sm">
              You asked the tenant to answer these and they have not come back yet. None of them stops you sending — the
              lease will simply say nothing about them.
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
              {outstandingDelegations(delegatedFields, values).map((entry) => (
                <li key={entry.raw}>
                  {entry.question}
                  <span className="block text-muted-foreground text-xs">{entry.stepTitle}</span>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {(data?.unreviewedClauses.length ?? 0) > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Clauses in this lease have not been approved yet</AlertTitle>
          <AlertDescription>
            <p className="text-sm">
              These are drafted but unapproved, and this organisation may not send a lease containing them. Approve them
              in the clause library, or remove what selects them.
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-4 font-mono text-xs">
              {data?.unreviewedClauses.map((slug) => (
                <li key={slug}>{slug}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {(data?.yardFindings.length ?? 0) > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Part of the yard has not been given to anybody</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
              {data?.yardFindings.map((finding) => (
                <li key={finding}>{finding}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {(data?.reviewFindings.length ?? 0) > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>A reviewer is still waiting on you</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
              {data?.reviewFindings.map((finding) => (
                <li key={finding}>{finding}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/*
        One alert per finding rather than a bundled list: each carries its own
        citation and the exact words it matched, and a reader has to be able to
        judge the match for themselves. A collapsed summary would hide the one
        thing that makes this honest.
      */}
      {data?.clauseFindings.map((finding, index) => (
        <Alert
          key={`${finding.ruleId}-${finding.clauseHeading}-${index}`}
          variant={finding.severity === 'blocks' ? 'destructive' : 'warning'}
        >
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {finding.clauseHeading} — {finding.citation}
          </AlertTitle>
          <AlertDescription>
            <p>{finding.message}</p>
            <p className="mt-2 text-xs leading-relaxed opacity-90">{finding.statute}</p>
            {finding.matched.filter(Boolean).length > 0 && (
              <p className="mt-2 font-mono text-xs">
                matched:{' '}
                {finding.matched
                  .filter(Boolean)
                  .map((m) => `"${m}"`)
                  .join(', ')}
              </p>
            )}
          </AlertDescription>
        </Alert>
      ))}

      {(data?.duplicateAssertions.length ?? 0) > 0 && (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Two clauses cover the same ground</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 space-y-1 text-sm">
              {data?.duplicateAssertions.map((d) => (
                <li key={d.assertion}>
                  <span className="font-mono text-xs">{d.assertion}</span> — {d.slugs.join(', ')}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {data?.readyToSend && (
        <Alert>
          <Check className="h-4 w-4" />
          <AlertTitle>Nothing is blocking this lease</AlertTitle>
          <AlertDescription>
            Every answer is within the limits Florida sets, and no variable is unfilled.
          </AlertDescription>
        </Alert>
      )}

      {/*
        Between the findings and the Send button on purpose: reviewing is the
        step between "nothing is blocking this" and "it has gone out", and a
        review panel below the send control would be a review panel nobody
        reads.
      */}
      <div className="border-t pt-2">
        <LeaseReviewPanel matterId={matterId} origin={typeof window === 'undefined' ? '' : window.location.origin} />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button asChild variant="outline">
          <a href={`/t/${teamUrl}/leases/${matterId}/preview`} target="_blank" rel="noreferrer">
            <FileText className="mr-2 h-4 w-4" />
            Preview the lease PDF
          </a>
        </Button>

        <Button disabled={!data?.readyToSend || send.isPending} onClick={() => setConfirming(true)}>
          <Send className="mr-2 h-4 w-4" />
          Send for signature
        </Button>
      </div>

      {/*
        A confirmation step rather than a direct send, because this is the one
        irreversible action in the feature: the moment it succeeds, a real
        document is in other people's inboxes and the answers are frozen.
        Naming every recipient here is the point — a mistyped address is
        invisible on the parties step and obvious in a list headed "these
        people will receive it".
      */}
      {confirming && (
        <div className="rounded-lg border border-foreground/20 bg-muted/40 p-5">
          <h3 className="font-semibold">Send this lease to {parties.length} people?</h3>
          <p className="mt-1 text-muted-foreground text-sm">
            Each person receives their own signing link. Once sent, the answers are frozen and the lease can no longer
            be edited.
          </p>

          <ul className="mt-4 space-y-1.5 text-sm">
            {parties.map((party) => (
              <li key={party.email} className="flex items-baseline gap-2">
                <span className="font-medium">{party.name}</span>
                <span className="text-muted-foreground text-xs uppercase tracking-wide">{party.role}</span>
                <span className="text-muted-foreground">{party.email}</span>
              </li>
            ))}
          </ul>

          {send.error && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>The lease was not sent</AlertTitle>
              <AlertDescription>{send.error.message}</AlertDescription>
            </Alert>
          )}

          <div className="mt-5 flex items-center gap-3">
            <Button disabled={send.isPending} onClick={() => send.mutate({ id: matterId })}>
              {send.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                'Yes, send it'
              )}
            </Button>

            <Button variant="ghost" disabled={send.isPending} onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
