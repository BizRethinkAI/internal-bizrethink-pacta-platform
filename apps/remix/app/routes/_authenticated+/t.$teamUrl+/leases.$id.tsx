import type { InterviewAnswers } from '@bizrethink/customizations/lease/interview/steps';
import { FL_INTERVIEW, visibleSteps } from '@bizrethink/customizations/lease/interview/steps';
import type { LeasePartyInput } from '@bizrethink/customizations/lease/parties/derive-parties';
import { canAccessLeaseBuilder } from '@bizrethink/customizations/server-only/feature-access';
import { getSession } from '@documenso/auth/server/lib/utils/get-session';
import { getTeamByUrl } from '@documenso/lib/server-only/team/get-team';
import { prisma } from '@documenso/prisma';
import { trpc } from '@documenso/trpc/react';
import { Alert, AlertDescription, AlertTitle } from '@documenso/ui/primitives/alert';
import { Button } from '@documenso/ui/primitives/button';
import { Progress } from '@documenso/ui/primitives/progress';
import { msg } from '@lingui/core/macro';
import { AlertTriangle, ArrowLeft, ArrowRight, Check, FileText, Loader2, Send } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLoaderData, useRevalidator } from 'react-router';

import { CustomClauseEditor } from '~/components/general/lease/custom-clause-editor';
import type { FieldValue } from '~/components/general/lease/interview-field';
import { InterviewFieldControl } from '~/components/general/lease/interview-field';
import { PartyEditor } from '~/components/general/lease/party-editor';
import { LeaseReviewPanel } from '~/components/general/lease/review-panel';
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

  return {
    teamUrl,
    matter: {
      id: matter.id,
      title: matter.title,
      status: matter.status,
      currentStepId: matter.currentStepId,
      facts: matter.facts as Record<string, FieldValue>,
      money: matter.money as Record<string, unknown>,
      values: matter.values as Record<string, FieldValue>,
      customClauses: matter.customClauses as InterviewAnswers['customClauses'],
      parties: matter.parties as LeasePartyInput[],
      envelopeId: matter.envelopeId,
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
  const { teamUrl, matter } = useLoaderData<typeof loader>();

  const [facts, setFacts] = useState<Record<string, FieldValue>>(matter.facts);
  const [money, setMoney] = useState<Record<string, unknown>>(matter.money);
  const [values, setValues] = useState<Record<string, FieldValue>>(matter.values);
  const [customClauses, setCustomClauses] = useState<InterviewAnswers['customClauses']>(matter.customClauses);
  const [parties, setParties] = useState<LeasePartyInput[]>(matter.parties);

  const answers = useMemo(
    () => ({ facts, money, values, customClauses, parties }) as unknown as InterviewAnswers,
    [facts, money, values, customClauses, parties],
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

    await saveStep.mutateAsync({
      id: matter.id,
      currentStepId: target.id,
      answers: { facts, money, values, customClauses, parties } as never,
    });

    setStepIndex(index);

    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0 });
    }
  };

  if (!step) {
    return null;
  }

  const visibleFields = step.fields.filter((f) => f.showWhen === undefined || f.showWhen(answers));

  return (
    <div className="mx-auto w-full max-w-screen-lg px-4 md:px-8">
      <div className="mt-8">
        <h1 className="font-semibold text-2xl">{matter.title}</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Step {safeIndex + 1} of {steps.length} · {step.title}
        </p>
        <Progress value={((safeIndex + 1) / steps.length) * 100} className="mt-4 h-1.5" />
      </div>

      {/* Every step is reachable. An interview that forces a strict order is
          one you cannot correct a typo in without walking the whole thing. */}
      <nav className="mt-4 flex flex-wrap gap-1.5">
        {steps.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => void goTo(i)}
            className={
              i === safeIndex
                ? 'rounded-md bg-foreground px-2.5 py-1 font-medium text-background text-xs'
                : 'rounded-md bg-muted px-2.5 py-1 text-muted-foreground text-xs hover:bg-muted/70'
            }
          >
            {i + 1}. {s.title}
          </button>
        ))}
      </nav>

      <section className="mt-8">
        <h2 className="font-semibold text-xl">{step.title}</h2>
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
            />
          ))}
        </div>

        {step.id === 'custom-clauses' && (
          <CustomClauseEditor
            sections={step.customClauseSections ?? []}
            clauses={customClauses}
            onChange={setCustomClauses}
          />
        )}

        {step.id === 'review' && (
          <ReviewPanel
            teamUrl={teamUrl}
            matterId={matter.id}
            status={matter.status}
            envelopeId={matter.envelopeId}
            parties={parties}
            query={{ isLoading: validate.isLoading, data: validate.data as ValidationResult | undefined }}
          />
        )}
      </section>

      <div className="mt-10 flex items-center justify-between border-t py-6">
        <Button variant="outline" disabled={safeIndex === 0} onClick={() => void goTo(safeIndex - 1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <span className="text-muted-foreground text-xs">
          {saveStep.isPending ? 'Saving…' : 'Progress saves as you move between steps'}
        </span>

        <Button disabled={safeIndex === steps.length - 1} onClick={() => void goTo(safeIndex + 1)}>
          Next
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
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
  query,
}: {
  teamUrl: string;
  matterId: string;
  status: string;
  envelopeId: string | null;
  parties: LeasePartyInput[];
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

  const data = query.data;

  if (!data) {
    return null;
  }

  return (
    <div className="mt-6 space-y-4">
      {data.findings.map((finding) => (
        <Alert key={finding.code} variant={finding.severity === 'blocks' ? 'destructive' : 'warning'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{finding.citation}</AlertTitle>
          <AlertDescription>{finding.message}</AlertDescription>
        </Alert>
      ))}

      {data.missing.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{data.missing.length} answers still outstanding</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-disc space-y-1 pl-4 font-mono text-xs">
              {data.missing.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {data.partyFindings.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>The signer list needs attention</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
              {data.partyFindings.map((finding) => (
                <li key={finding}>{finding}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {data.reviewFindings.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>A reviewer is still waiting on you</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
              {data.reviewFindings.map((finding) => (
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
      {data.clauseFindings.map((finding) => (
        <Alert
          key={`${finding.ruleId}-${finding.clauseHeading}`}
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

      {data.duplicateAssertions.length > 0 && (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Two clauses cover the same ground</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 space-y-1 text-sm">
              {data.duplicateAssertions.map((d) => (
                <li key={d.assertion}>
                  <span className="font-mono text-xs">{d.assertion}</span> — {d.slugs.join(', ')}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {data.readyToSend && (
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

        <Button disabled={!data.readyToSend || send.isPending} onClick={() => setConfirming(true)}>
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
