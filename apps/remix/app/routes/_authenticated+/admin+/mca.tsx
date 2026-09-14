import type { ConformityEntry, ConformityKind } from '@bizrethink/customizations';
import { LegalSummary, LegalText, LegalWorkspace } from '@bizrethink/customizations/legal-ui/reader';
import legalStyles from '@bizrethink/customizations/legal-ui/reading.css?url';
import { McaWorkspaceNav } from '@bizrethink/customizations/mca/components/workspace-nav';
import { JURISDICTION_NAMES } from '@bizrethink/customizations/mca/jurisdictions';
import { getSession } from '@documenso/auth/server/lib/utils/get-session';
import { isAdmin } from '@documenso/lib/utils/is-admin';
import { Alert, AlertDescription, AlertTitle } from '@documenso/ui/primitives/alert';
import { Badge } from '@documenso/ui/primitives/badge';
import { Button } from '@documenso/ui/primitives/button';
import { Input } from '@documenso/ui/primitives/input';
import { msg } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { AlertTriangleIcon, EyeIcon, FileWarningIcon } from 'lucide-react';
import { Link, useLoaderData, useSearchParams } from 'react-router';

import { buildMcaConformityView } from '~/utils/bizrethink-mca-conformity.server';
import { appMetaTags } from '~/utils/meta';

import type { Route } from './+types/mca';

export const links: Route.LinksFunction = () => [{ rel: 'stylesheet', href: legalStyles }];

/**
 * ADR 0015: one MCA workspace, separate release controls. This view verifies
 * prescribed forms and disclosure requirements; it remains read-only. Shared
 * navigation does not grant authority to approve or alter a regulator's words.
 */

export function meta() {
  return appMetaTags(msg`MCA disclosures & requirements`);
}

/**
 * PACTA STAFF ONLY.
 *
 * The same gate `lease-library.tsx` uses, and for the same reason: this is the
 * instance's legal content, identical for every customer, not a customer's
 * data. Gated here as well as by the admin layout — the layout's check runs for
 * the route group, but a loader that fetches before it resolves would still
 * read.
 *
 * No organisation is resolved and no database is touched. Unlike the clause
 * library there is nothing per-organisation here: no approvals, no review
 * links, no findings table. The whole page is a function of files committed to
 * this repository, re-read on every request so a re-vendored source shows up
 * without a deploy.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await getSession(request);

  if (!isAdmin(user)) {
    throw new Response('Not Found', { status: 404 });
  }

  return buildMcaConformityView(new URL(request.url).searchParams.get('source'));
}

const ASSURANCE_LABEL = {
  unverified: 'Not verified',
  'partly-verified': 'Partly verified',
  verified: 'Verified',
} as const;

/*
  NO GREEN FOR "partly-verified", DELIBERATELY.

  A state with a current verification date and four rows whose contents no check
  reads is not verified. Rendering it in the same colour as one that is would
  make the page's most common row its most misleading one, so the middle level
  is amber and says what is missing beside it.
*/
const ASSURANCE_VARIANT = {
  unverified: 'destructive',
  'partly-verified': 'warning',
  verified: 'default',
} as const;

/*
  THREE SHAPES, NAMED IN ONE PLACE.

  These were ternaries — `kind === 'prescribed-form' ? 'rows' : 'requirements'`
  — which is exactly the binary that sent an itemization down the wrong branch
  in the view model. A record keyed on `ConformityKind` cannot silently absorb
  a fourth shape: adding one to the union makes these fail the typecheck, which
  CI now runs as a blocking step.
*/
const KIND_LABEL: Record<ConformityKind, string> = {
  'prescribed-form': 'prescribed form',
  itemization: 'itemization of amount financed',
  'content-statute': 'content-only statute',
};

/** What the document is made of, so a count is never called the wrong thing. */
const KIND_UNIT: Record<ConformityKind, string> = {
  'prescribed-form': 'rows',
  itemization: 'lines',
  'content-statute': 'requirements',
};

/*
  WHERE THE TEXT CAME FROM, IN A WORD AND THEN IN A SENTENCE.

  Keyed on `ConformityEntry['origin']` rather than a bare string map, so a new
  member of the union fails the typecheck here instead of rendering as
  `undefined` — the same discipline as KIND_LABEL above, and for the same reason
  it was introduced.

  The verdict is derived from the vendored file's own header on every load
  (`mca/provenance/source-origin.ts`). It is never a field on a spec: a spec
  asserting "official publisher" with nothing re-executing it is the defect this
  package exists to prevent, one level up from a verification date nobody
  re-earns.
*/
const ORIGIN_LABEL: Record<ConformityEntry['origin'], string> = {
  'official-publisher': 'retrieval recorded, from the publisher that enacted or codified it',
  'origin-not-recorded': 'ORIGIN NOT RECORDED — the file does not say where this text came from',
  'secondary-publisher': 'FROM A SECONDARY PUBLISHER — this is a reproduction, not the enacted text',
};

/*
  HOW OLD THE READING IS.

  The question the digest cannot answer. When a regulator amends a rule our
  vendored file does not move, so the digest still matches and every other check
  goes on passing about text that is no longer the law.
*/
const FRESHNESS_LABEL: Record<ConformityEntry['freshness'], string> = {
  fresh: 'read within the last',
  stale: 'NOT READ IN',
  'never-read': 'never read',
};

const DIGEST_LABEL = {
  matches: 'digest matches',
  stale: 'DIGEST STALE — the source has changed since it was verified',
  'source-missing': 'SOURCE MISSING from mca/sources/',
} as const;

const StateCard = ({ entry }: { entry: ConformityEntry }) => (
  <div className="rounded-lg border border-border p-4">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <div>
        <h3 className="font-semibold text-lg">
          {entry.jurisdictionName}{' '}
          <span className="font-normal text-muted-foreground text-sm">{entry.jurisdiction}</span>
        </h3>
        <p className="text-muted-foreground text-sm">
          {entry.citation} · {KIND_LABEL[entry.kind]}
        </p>
      </div>

      <Badge variant={ASSURANCE_VARIANT[entry.assurance]}>{ASSURANCE_LABEL[entry.assurance]}</Badge>
    </div>

    <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
      <div>
        <dt className="text-muted-foreground text-xs uppercase">Transcribed from</dt>
        <dd className="font-mono text-xs">{entry.sourceFile}</dd>
        {/*
          The section anchors, not decoration. California's regulation
          prescribes at least six different tables in one file and only the
          sales-based one is ours; New York's file contains California's
          phrasing of a prescribed sentence in a section governing a different
          transaction type. Checking against the whole file accepts both.
        */}
        <dd className="mt-1 text-muted-foreground text-xs">
          {entry.section ? (
            <>
              scoped to <span className="font-mono">{entry.section.from}</span> …{' '}
              <span className="font-mono">{entry.section.to}</span>
            </>
          ) : (
            'whole file — this instrument is the only thing in it'
          )}
        </dd>
      </div>

      <div>
        <dt className="text-muted-foreground text-xs uppercase">Verified</dt>
        <dd>Words: {entry.verbatimVerifiedAt ?? <span className="font-semibold text-destructive">never</span>}</dd>
        <dd>
          Structure:{' '}
          {entry.structureApplicable ? (
            (entry.structureVerifiedAt ?? <span className="font-semibold text-destructive">never</span>)
          ) : (
            <span className="text-muted-foreground">
              not applicable — this statute prescribes information, not a document structure
            </span>
          )}
        </dd>
        {entry.structureEvidence === 'prose-described' && (
          <dd className="text-muted-foreground text-xs">
            row order verified by a human, not re-executed — the source describes the rows in an order that is not the
            table&rsquo;s
          </dd>
        )}
        {/*
          HOW LONG AGO A HUMAN LOOKED.

          The dates above say a reading happened; this says how old it is. It is
          the only thing on this card that gets worse while nobody touches
          anything, and the only signal there is for the failure a digest cannot
          see: a regulator amends the rule, our vendored file does not move, and
          every other line here goes on passing.
        */}
        <dd
          className={
            entry.freshness === 'fresh' ? 'text-muted-foreground text-xs' : 'font-semibold text-destructive text-xs'
          }
        >
          {FRESHNESS_LABEL[entry.freshness]}
          {entry.lastReadAt === null
            ? ' — no usable date to age this reading from'
            : ` — ${entry.lastReadAt}, ${entry.daysSinceRead} days ago`}
        </dd>
      </div>

      {/*
        WHERE THE TEXT CAME FROM.

        Georgia's card looked exactly like California's while what we held was a
        browser capture of law.justia.com missing subsection (a) — "advance
        fee", the term the broker prohibition turns on, was defined nowhere in
        it, and the digest over it matched on every run. The file said where it
        came from in its own header, and nothing read the header. This is that
        header, read on every load.
      */}
      <div className="sm:col-span-2">
        <dt className="text-muted-foreground text-xs uppercase">Where the text came from</dt>
        <dd
          className={entry.origin === 'official-publisher' ? 'text-muted-foreground' : 'font-semibold text-destructive'}
        >
          {ORIGIN_LABEL[entry.origin]}
        </dd>
        <dd className="mt-1 text-muted-foreground text-xs">{entry.originWhy}</dd>
        {entry.originEvidence !== null && <dd className="mt-1 font-mono text-xs">{entry.originEvidence}</dd>}
      </div>

      <div className="sm:col-span-2">
        <dt className="text-muted-foreground text-xs uppercase">Vendored source</dt>
        <dd className={entry.digest === 'matches' ? 'text-muted-foreground' : 'font-semibold text-destructive'}>
          {DIGEST_LABEL[entry.digest]}
        </dd>
        {entry.digest !== 'matches' && (
          <dd className="mt-1 font-mono text-xs">
            recorded {entry.recordedDigest.slice(0, 16)}… / found {entry.observedDigest?.slice(0, 16) ?? '—'}…
          </dd>
        )}
      </div>
    </dl>

    {/*
      THE NUMBER THE PAGE EXISTS FOR.

      Five of New York's eleven rows and four of California's ten prescribe "a
      short explanation" and supply no words, so the checker reads the label and
      not the contents. On a content-only statute it is every requirement: those
      acts prescribe no sentence at all.
    */}
    {entry.unreadable.length > 0 && (
      <div className="mt-4 rounded border border-amber-500/40 bg-amber-500/5 p-3">
        <p className="flex items-center gap-2 font-medium text-sm">
          <EyeIcon className="h-4 w-4" aria-hidden="true" />
          {entry.unreadable.length} of {entry.rowsTotal} {KIND_UNIT[entry.kind]}: label read, contents not
        </p>
        <ul className="mt-2 space-y-1 text-sm">
          {/*
            Indexed key, not label-keyed. Texas maps fifteen statutory
            requirements onto rows and two of its labels appear twice —
            "Estimated Periodic Payment" for §398.051(a)(5) and
            (a)(6)(B)(i), "Prepayment" for (a)(8) and (a)(9). A label key
            collides there.

            The citations were wrong when first written: they read (a)(9) and
            (a)(10), but (a)(10) is "Collateral Requirements or Security
            Interests" and duplicates nothing. The FIX was right and the reason
            given for it was not — the harder error to notice, because the code
            works, so nothing fails, and the next reader inherits a false
            statement about the statute.
          */}
          {entry.unreadable.map((u, i) => (
            <li key={`${entry.slug}-${i}-${u.label}`}>
              <span className="font-medium">{u.label}</span> <span className="text-muted-foreground">— {u.why}</span>
            </li>
          ))}
        </ul>
      </div>
    )}

    {/*
      Sentences the regulation compels but does not word, so the words are ours
      inside a row it otherwise closes. Lawful, sometimes required, and not
      matchable against the source.
    */}
    {entry.providerDrafted.length > 0 && (
      <div className="mt-3 text-sm">
        <p className="font-medium">Our wording inside a verified row</p>
        <ul className="mt-1 text-muted-foreground">
          {entry.providerDrafted.map((p) => (
            <li key={`${p.citation}-${p.row}`}>
              row {p.row} — {p.citation} requires the subject and supplies no sentence
            </li>
          ))}
        </ul>
      </div>
    )}

    {entry.problems.length > 0 && (
      <Alert variant="destructive" className="mt-3">
        <FileWarningIcon className="h-4 w-4" />
        <AlertTitle>Provenance problems</AlertTitle>
        <AlertDescription>
          <ul className="space-y-1">
            {entry.problems.map((p) => (
              <li key={`${p.kind}-${p.detail}`}>
                <span className="font-mono text-xs">{p.kind}</span> — {p.detail}
              </li>
            ))}
          </ul>
        </AlertDescription>
      </Alert>
    )}

    {entry.publishGate.length > 0 && (
      <Alert variant="destructive" className="mt-3">
        <AlertTriangleIcon className="h-4 w-4" />
        <AlertTitle>The publish gate refuses this spec</AlertTitle>
        <AlertDescription>
          <ul className="space-y-1">
            {entry.publishGate.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </AlertDescription>
      </Alert>
    )}

    <p className="mt-3 text-muted-foreground text-xs">
      {ASSURANCE_LABEL[entry.assurance]}: {entry.assuranceReasons.join('; ')}.
    </p>
  </div>
);

export default function AdminMcaConformityPage() {
  const { jurisdictions, entries, envelopes, readings, summary, source } = useLoaderData<typeof loader>();
  const [params, setParams] = useSearchParams();
  const active = ['readings', 'checks'].includes(params.get('view') ?? '') ? params.get('view') : 'disclosures';
  const state = params.get('state') ?? '';
  const query = (params.get('q') ?? '').toLowerCase();
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setParams(next, { preventScrollReset: true, replace: key === 'q' });
  };
  const filtered = entries.filter(
    (entry) =>
      (!state || entry.jurisdiction === state) &&
      `${entry.jurisdictionName} ${entry.citation} ${entry.kind}`.toLowerCase().includes(query),
  );
  return (
    <LegalWorkspace>
      <div className="min-w-0 pb-12">
        <McaWorkspaceNav />
        <p className="mb-2 text-muted-foreground text-xs uppercase tracking-widest">
          <Trans>Disclosure register</Trans>
        </p>
        <h1 className="font-semibold text-3xl tracking-tight">
          <Trans>MCA disclosures & requirements</Trans>
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground text-sm leading-relaxed">
          <Trans>
            Read the prescribed wording, source evidence and limits of each check. Provider-drafted explanations remain
            distinct from prescribed text.
          </Trans>
        </p>
        <LegalSummary
          values={[
            { label: <Trans>Disclosure specifications</Trans>, value: summary.total },
            { label: <Trans>Fully verified</Trans>, value: summary.verified },
            { label: <Trans>Contents no check reads</Trans>, value: summary.unreadable },
            { label: <Trans>Open readings</Trans>, value: readings.length },
          ]}
        />
        <p className="mb-5 rounded-lg border bg-muted/20 p-3 text-muted-foreground text-xs leading-relaxed">
          {summary.fromOfficialPublisher} / {summary.total} <Trans>sources from the official publisher</Trans> ·{' '}
          {summary.staleReadings} <Trans>readings older than</Trans> {summary.staleAfterDays}{' '}
          <Trans>
            days. Verification compares retained sources; it does not establish that current law or a filled disclosure
            has been reviewed.
          </Trans>
        </p>
        <fieldset className="mb-5 flex min-w-0 flex-wrap gap-2" aria-label="Disclosure views">
          {[
            { id: 'disclosures', label: <Trans>Disclosures</Trans> },
            { id: 'readings', label: <Trans>Open readings</Trans> },
            { id: 'checks', label: <Trans>Document checks</Trans> },
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={active === tab.id ? 'secondary' : 'ghost'}
              size="sm"
              aria-pressed={active === tab.id}
              onClick={() => update('view', tab.id)}
            >
              {tab.label}
            </Button>
          ))}
        </fieldset>
        {active === 'disclosures' && (
          <>
            <div className="mb-5 flex flex-wrap gap-3">
              <Input
                aria-label="Search disclosures"
                placeholder="Search a state, citation or form…"
                value={params.get('q') ?? ''}
                onChange={(event) => update('q', event.target.value)}
                className="min-w-48 flex-1"
              />
              <select
                aria-label="Disclosure jurisdiction"
                value={state}
                onChange={(event) => update('state', event.target.value)}
                className="h-10 rounded-md border bg-background px-3 text-sm"
              >
                <option value="">All jurisdictions</option>
                {jurisdictions.map((jurisdiction) => (
                  <option key={jurisdiction} value={jurisdiction}>
                    {JURISDICTION_NAMES[jurisdiction]}
                  </option>
                ))}
              </select>
            </div>
            <p role="status" className="mb-3 text-muted-foreground text-xs">
              {filtered.length} <Trans>disclosures</Trans>
            </p>
            <div className="space-y-3">
              {filtered.map((entry) => (
                <details
                  key={entry.slug}
                  open={params.get('source') === entry.slug || undefined}
                  className="rounded-lg border"
                  data-disclosure={entry.slug}
                >
                  <summary className="cursor-pointer px-4 py-4">
                    <span className="inline-flex max-w-full flex-wrap items-center gap-3">
                      <strong>{entry.jurisdictionName}</strong>
                      <span className="text-muted-foreground text-sm">
                        {entry.citation} · {KIND_LABEL[entry.kind]}
                      </span>
                      <Badge variant={ASSURANCE_VARIANT[entry.assurance]}>{ASSURANCE_LABEL[entry.assurance]}</Badge>
                    </span>
                  </summary>
                  <div className="space-y-5 border-t p-4">
                    <StateCard entry={entry} />
                    <Button asChild variant="outline" size="sm">
                      <Link
                        preventScrollReset
                        to={`?${new URLSearchParams({ ...Object.fromEntries(params), source: entry.slug })}`}
                      >
                        <Trans>Read source & coverage details</Trans>
                      </Link>
                    </Button>
                    {source?.slug === entry.slug && (
                      <>
                        <h3 className="font-semibold text-lg">
                          <Trans>Rows, lines & requirements</Trans>
                        </h3>
                        <ol className="divide-y rounded-lg border">
                          {source.rows.map((row) => (
                            <li key={row.id} className="space-y-3 p-4">
                              <div className="flex flex-wrap gap-3">
                                <span className="text-muted-foreground text-sm">{row.id}</span>
                                <h4 className="font-semibold">{row.label}</h4>
                              </div>
                              <p className="text-muted-foreground text-xs">{row.citation}</p>
                              {row.labelPrescribed && (
                                <Badge variant="neutral">
                                  <Trans>Prescribed label</Trans>
                                </Badge>
                              )}
                              {row.calculation && (
                                <p className="rounded-md bg-muted p-3 text-sm">
                                  <Trans>Required calculation reference</Trans>:{' '}
                                  {row.calculation.kind === 'sum-of-preceding' ? (
                                    <Trans>Sum of all preceding lines</Trans>
                                  ) : (
                                    <>
                                      {row.calculation.minuend} − {row.calculation.subtrahend}
                                    </>
                                  )}
                                </p>
                              )}
                              {row.evidence.length > 0 && (
                                <details className="rounded-md border p-3">
                                  <summary className="cursor-pointer text-sm">
                                    <Trans>Required evidence in this row</Trans>
                                  </summary>
                                  <ul className="mt-2 space-y-2">
                                    {row.evidence.map((text) => (
                                      <li key={text}>
                                        <LegalText text={text} />
                                      </li>
                                    ))}
                                  </ul>
                                </details>
                              )}
                              {row.labelSuffix && <LegalText text={row.labelSuffix} />}
                              {row.text ? (
                                <LegalText text={row.text} />
                              ) : (
                                <p className="text-muted-foreground text-sm">
                                  <Trans>No fixed sentence supplied for this content.</Trans>
                                </p>
                              )}
                              {row.onlyPrescribedContent && (
                                <Badge variant="warning">
                                  <Trans>Only prescribed content</Trans>
                                </Badge>
                              )}
                              {row.thirdColumnEmpty && (
                                <p className="font-medium text-sm">
                                  <Trans>The third column must remain empty.</Trans>
                                </p>
                              )}
                              {row.alsoPermitted.map((text) => (
                                <div key={text}>
                                  <h5 className="mb-2 font-medium text-sm">
                                    <Trans>Also permitted</Trans>
                                  </h5>
                                  <LegalText text={text} />
                                </div>
                              ))}
                              {row.providerDrafted.map((item) => (
                                <div key={item.citation} className="rounded-md bg-muted p-3">
                                  <h5 className="mb-2 font-medium text-sm">
                                    <Trans>Provider-drafted explanation</Trans> · {item.citation}
                                  </h5>
                                  <LegalText text={item.text} />
                                </div>
                              ))}
                            </li>
                          ))}
                        </ol>
                        <details className="rounded-lg border p-4" open>
                          <summary className="cursor-pointer font-semibold">
                            <Trans>Scoped source passage</Trans>
                          </summary>
                          <div className="mt-4 max-h-[60dvh] overflow-y-auto pr-3">
                            {source.passage ? (
                              <LegalText text={source.passage} />
                            ) : (
                              <p role="alert">
                                <Trans>
                                  The recorded section boundaries are unavailable. No wider passage has been
                                  substituted.
                                </Trans>
                              </p>
                            )}
                          </div>
                        </details>
                        <details className="rounded-lg border p-4">
                          <summary className="cursor-pointer font-medium text-sm">
                            <Trans>Full retained source · outside the scoped verification passage</Trans>
                          </summary>
                          <div className="mt-4 max-h-[60dvh] overflow-y-auto pr-3">
                            <LegalText text={source.wholeSource} />
                          </div>
                        </details>
                      </>
                    )}
                  </div>
                </details>
              ))}
            </div>
            {filtered.length === 0 && (
              <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                <Trans>No disclosures match these filters.</Trans>
              </p>
            )}
          </>
        )}
        {active === 'readings' && (
          <section>
            <h2 className="font-semibold text-xl">
              <Trans>Open readings</Trans>
            </h2>
            <p className="my-3 text-muted-foreground text-sm">
              <Trans>
                Questions that affect the current checks. This register does not record or resolve counsel's answer.
              </Trans>
            </p>
            <div className="space-y-4">
              {readings.map((reading) => (
                <article key={reading.id} className="rounded-lg border p-5">
                  <p className="mb-2 text-muted-foreground text-xs">
                    {reading.id} · {reading.jurisdictions.map((j) => JURISDICTION_NAMES[j]).join(', ')} ·{' '}
                    {reading.surface}
                  </p>
                  <h3 className="font-medium leading-relaxed">{reading.question}</h3>
                  <p className="mt-3 text-muted-foreground text-sm leading-relaxed">{reading.effect}</p>
                  {reading.changesVerdicts && (
                    <Badge variant="warning" className="mt-3">
                      <Trans>Changes verdicts</Trans>
                    </Badge>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}
        {active === 'checks' && (
          <section>
            <h2 className="font-semibold text-xl">
              <Trans>Document check availability</Trans>
            </h2>
            <p className="my-3 text-muted-foreground text-sm">
              <Trans>
                These counts show which checks a document combination makes possible. They are not results from a filled
                transaction.
              </Trans>
            </p>
            <div className="space-y-4">
              {envelopes.map((shape) => (
                <article key={shape.id} className="rounded-lg border p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <h3 className="font-semibold">{shape.label}</h3>
                    <Badge variant="neutral">
                      {shape.evaluable} / {shape.total} evaluable
                    </Badge>
                  </div>
                  {shape.undetectable.length > 0 && (
                    <p className="mt-3 text-sm">Undetectable: {shape.undetectable.join(', ')}</p>
                  )}
                  <ul className="mt-4 divide-y">
                    {shape.skipped.map((check) => (
                      <li key={check.identity} className="py-3 text-sm">
                        <strong>{check.statement}</strong>
                        <p className="mt-1 text-muted-foreground">Unavailable: {check.reason}</p>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </LegalWorkspace>
  );
}
