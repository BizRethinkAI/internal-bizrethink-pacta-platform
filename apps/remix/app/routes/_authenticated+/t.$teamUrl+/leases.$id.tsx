import type { InterviewAnswers } from '@bizrethink/customizations/lease/interview/steps';
import { FL_INTERVIEW, visibleSteps } from '@bizrethink/customizations/lease/interview/steps';
import { canAccessLeaseBuilder } from '@bizrethink/customizations/server-only/feature-access';
import { getSession } from '@documenso/auth/server/lib/utils/get-session';
import { getTeamByUrl } from '@documenso/lib/server-only/team/get-team';
import { prisma } from '@documenso/prisma';
import { trpc } from '@documenso/trpc/react';
import { Alert, AlertDescription, AlertTitle } from '@documenso/ui/primitives/alert';
import { Button } from '@documenso/ui/primitives/button';
import { Progress } from '@documenso/ui/primitives/progress';
import { msg } from '@lingui/core/macro';
import { AlertTriangle, ArrowLeft, ArrowRight, Check, FileText, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLoaderData } from 'react-router';

import { CustomClauseEditor } from '~/components/general/lease/custom-clause-editor';
import type { FieldValue } from '~/components/general/lease/interview-field';
import { InterviewFieldControl } from '~/components/general/lease/interview-field';
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

  const [facts, setFacts] = useState(matter.facts);
  const [money, setMoney] = useState(matter.money);
  const [values, setValues] = useState(matter.values);
  const [customClauses, setCustomClauses] = useState(matter.customClauses);

  const answers = useMemo(
    () => ({ facts, money, values, customClauses }) as unknown as InterviewAnswers,
    [facts, money, values, customClauses],
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
      answers: { facts, money, values, customClauses } as never,
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

        {step.id === 'review' && <ReviewPanel teamUrl={teamUrl} matterId={matter.id} query={validate} />}
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

type ValidateQuery = ReturnType<typeof trpc.bizrethink.leaseBuilder.matter.validate.useQuery>;

/**
 * The review step. Three kinds of problem, kept apart because each is resolved
 * differently: a statutory limit by changing an answer, an unfilled variable by
 * answering a question, an unreviewed clause by an attorney.
 */
const ReviewPanel = ({ teamUrl, matterId, query }: { teamUrl: string; matterId: string; query: ValidateQuery }) => {
  if (query.isLoading) {
    return (
      <p className="mt-6 flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking the lease against Florida law…
      </p>
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

      <div className="flex items-center gap-3 pt-2">
        <Button asChild variant="outline">
          <a href={`/t/${teamUrl}/leases/${matterId}/preview`} target="_blank" rel="noreferrer">
            <FileText className="mr-2 h-4 w-4" />
            Preview the lease PDF
          </a>
        </Button>

        <Button
          disabled={!data.readyToSend}
          title={data.readyToSend ? 'Not wired up yet' : 'Resolve the findings above'}
        >
          Send for signature
        </Button>
      </div>
    </div>
  );
};
