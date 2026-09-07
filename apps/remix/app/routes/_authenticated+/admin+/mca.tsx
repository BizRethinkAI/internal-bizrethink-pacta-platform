import type { ConformityEntry, ConformityKind } from '@bizrethink/customizations';
import { JURISDICTION_NAMES } from '@bizrethink/customizations/mca/jurisdictions';
import { getSession } from '@documenso/auth/server/lib/utils/get-session';
import { isAdmin } from '@documenso/lib/utils/is-admin';
import { Alert, AlertDescription, AlertTitle } from '@documenso/ui/primitives/alert';
import { Badge } from '@documenso/ui/primitives/badge';
import { msg } from '@lingui/core/macro';
import { AlertTriangle, Eye, FileWarning, HelpCircle, ScrollText } from 'lucide-react';
import { useLoaderData } from 'react-router';

import { buildMcaConformityView } from '~/utils/bizrethink-mca-conformity.server';
import { appMetaTags } from '~/utils/meta';

import type { Route } from './+types/mca';

/**
 * MCA conformity — read-only, and read-only is the design.
 *
 * ADR 0008. The lease library's page promises that "a clause reaches a third
 * party only once an attorney has approved the exact words below". That promise
 * is coherent for text we wrote and a category error for 10 CCR §914, whose
 * words California prescribes and whose row §914(a)(2) closes with "shall
 * include only". There is nothing here for counsel to approve, an approval
 * would assert an authority counsel does not have over a regulator's text, and
 * editing the text to satisfy a reviewer would be the defect rather than the
 * fix.
 *
 * SO THERE IS NO APPROVE BUTTON, AND THIS PAGE MUST NEVER GROW ONE. The first
 * person to press it would record an attorney's name and bar number against
 * California's sentence. That is also why this route shares no component with
 * `lease-library.tsx`: reusing a clause row would import its approval affordance
 * along with its layout.
 *
 * WHAT THIS PAGE IS FOR. The conformity half of the vertical has no approval
 * step, and an approval step is also a READ step — it is the mechanism that
 * forces a human to look. Nothing equivalent exists here, and the rows the
 * checker can only see the label of still need human eyes. This page is the
 * substitute, and it is a weaker one: it makes the gaps visible to anyone who
 * opens it and compels nobody to open it.
 *
 * IT DECIDES NOTHING. Every number, verdict and reason on it is computed by
 * `packages/bizrethink/mca/surface/view.ts` and asserted in
 * `mca/__tests__/surface.test.ts`. This file arranges them on a screen.
 */

export function meta() {
  return appMetaTags(msg`MCA conformity`);
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

  return buildMcaConformityView();
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
          <Eye className="h-4 w-4" aria-hidden="true" />
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
        <FileWarning className="h-4 w-4" />
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
        <AlertTriangle className="h-4 w-4" />
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
  const { library, jurisdictions, entries, envelopes, readings } = useLoaderData<typeof loader>();

  const notFullyVerified = entries.filter((e) => e.assurance !== 'verified').length;
  const unreadableRows = entries.reduce((n, e) => n + e.unreadable.length, 0);

  return (
    <div className="mx-auto w-full max-w-screen-lg px-4 pb-16 md:px-8">
      <div className="mt-8">
        <h1 className="font-semibold text-3xl">MCA conformity</h1>
        <p className="mt-1 max-w-3xl text-muted-foreground">
          The eleven states that require a commercial-financing disclosure, and what each one&rsquo;s spec has actually
          been checked against. These are regulators&rsquo; words, not ours &mdash; this page reports and records
          nothing.
        </p>
        <p className="mt-2 font-mono text-muted-foreground text-xs">library: {library}</p>
      </div>

      {/*
        Stated first, plainly, because the failure mode of a page like this is
        looking reassuring. Someone opening it a year from now needs to know
        what "verified" claims and what it does not.
      */}
      <Alert className="mt-6" variant="warning">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>
          {notFullyVerified} of {entries.length} disclosures are not fully verified, and {unreadableRows} of their rows,
          lines and requirements have contents no check reads
        </AlertTitle>
        <AlertDescription>
          A verification date means every prescribed label and every prescribed sentence was still found in the vendored
          source, in the section the spec was transcribed from, on the last run. It does not mean a human has read the
          current regulation, and it says nothing about a row the regulation leaves unworded. Those rows are listed
          under each state.
        </AlertDescription>
      </Alert>

      <Alert className="mt-4">
        <ScrollText className="h-4 w-4" />
        <AlertTitle>There is no approval on this page, and that is deliberate</AlertTitle>
        <AlertDescription>
          The clause library records an attorney&rsquo;s approval of the exact words of a clause we drafted. Nothing
          here is ours to word: 10 CCR &sect;914 closes most of its rows with &ldquo;shall include only&rdquo;. An
          approval recorded against a regulator&rsquo;s sentence would put a name and bar number behind text no lawyer
          authored. Open questions are carried below as readings instead.
        </AlertDescription>
      </Alert>

      {jurisdictions.map((jurisdiction) => {
        const rows = entries.filter((e) => e.jurisdiction === jurisdiction);

        if (rows.length === 0) {
          return null;
        }

        return (
          <section key={jurisdiction} className="mt-8">
            <h2 className="font-semibold text-muted-foreground text-sm uppercase tracking-wide">
              {JURISDICTION_NAMES[jurisdiction]}
            </h2>
            <div className="mt-2 space-y-3">
              {rows.map((entry) => (
                <StateCard key={entry.slug} entry={entry} />
              ))}
            </div>
          </section>
        );
      })}

      {/*
        The instance checker's blind spots, by envelope shape.

        There is no filled envelope to report on here, and inventing figures so
        a number could be shown would be the reassurance the rest of this page
        refuses. What can be stated without one is which identities a given
        combination of DOCUMENTS lets the checker decide at all — which is what
        `skipped` turns on.
      */}
      <section className="mt-12">
        <h2 className="font-semibold text-2xl">What a filled disclosure could not be checked for</h2>
        <p className="mt-1 max-w-3xl text-muted-foreground text-sm">
          The instance checker compares figures printed on the documents travelling in one envelope. Two of the three
          REVIEW-01 blockers move the same sum in opposite directions, so every check that needs only the offer summary
          cancels exactly. An empty findings list on a one-document envelope therefore means very little.
        </p>

        <div className="mt-4 space-y-3">
          {envelopes.map((shape) => (
            <div key={shape.id} className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-medium">{shape.label}</h3>
                <span className="text-muted-foreground text-sm">
                  {shape.evaluable} of {shape.total} identities can be decided
                </span>
              </div>

              {shape.undetectable.length > 0 && (
                <p className="mt-2 text-destructive text-sm">
                  Undetectable in this shape: {shape.undetectable.join(', ')}
                </p>
              )}

              {shape.skipped.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm">
                  {shape.skipped.map((s) => (
                    <li key={s.identity}>
                      <span className="font-mono text-xs">{s.identity}</span>{' '}
                      <span className="text-muted-foreground">
                        &mdash; {s.statement}. Skipped: {s.reason}.
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>

      {/*
        READINGS, NOT APPROVALS.

        Each of these is a place where a check runs on an assumption because the
        regulation is silent or says two things. None of them is resolved by
        pressing anything on this page; they are resolved by counsel saying
        which way it goes, after which the code changes.
      */}
      <section className="mt-12">
        <h2 className="font-semibold text-2xl">Open readings</h2>
        <p className="mt-1 max-w-3xl text-muted-foreground text-sm">
          {readings.length} questions where a check runs on an assumption. Each is pinned by an assertion so it cannot
          be smoothed over before it is answered. These are questions for counsel; nothing on this page answers or
          records an answer to one.
        </p>

        <div className="mt-4 space-y-3">
          {readings.map((reading) => (
            <div key={reading.id} className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <HelpCircle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span className="font-mono text-sm">{reading.id}</span>
                <Badge variant="secondary">{reading.surface}</Badge>
                <span className="text-muted-foreground text-xs">
                  {reading.jurisdictions.map((j) => JURISDICTION_NAMES[j]).join(', ')}
                </span>
                {reading.changesVerdicts && <Badge variant="warning">changes verdicts</Badge>}
              </div>

              <p className="mt-2 text-sm">{reading.question}</p>
              <p className="mt-2 text-muted-foreground text-sm">{reading.effect}</p>
              <p className="mt-2 font-mono text-muted-foreground text-xs">pinned by mca/{reading.pinnedBy.file}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
