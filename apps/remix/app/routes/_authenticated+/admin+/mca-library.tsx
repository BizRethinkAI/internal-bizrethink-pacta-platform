import type { McaLibraryClauseView, McaLibraryInstrumentView, SourceState } from '@bizrethink/customizations';
import { getSession } from '@documenso/auth/server/lib/utils/get-session';
import { isAdmin } from '@documenso/lib/utils/is-admin';
import { Alert, AlertDescription, AlertTitle } from '@documenso/ui/primitives/alert';
import { Badge } from '@documenso/ui/primitives/badge';
import { Trans } from '@lingui/react/macro';
import { AlertTriangle, FileWarning, Lock, ScrollText } from 'lucide-react';
import { useLoaderData } from 'react-router';

import { buildMcaLibraryView } from '~/utils/bizrethink-mca-library.server';
import { appMetaTags } from '~/utils/meta';

import type { Route } from './+types/mca-library';

export function meta() {
  return appMetaTags('MCA Clauses');
}

/**
 * The MCA clause library — 192 clauses across six negotiated agreements.
 *
 * A SIBLING OF `/admin/lease-library`, AND A SEPARATE PAGE FROM `/admin/mca`.
 * ADR 0008: the MCA vertical is two surfaces with two release paths. `/admin/mca`
 * shows conformity — whether a disclosure meets a state's statute, where the
 * words are the regulator's and there is nothing for counsel to approve. This
 * shows OUR contract text, where approval is exactly what is needed and does
 * not yet exist.
 *
 * READ-ONLY, AND THAT IS THE WHOLE OF IT FOR NOW. No approval, no review link,
 * no mutation. Those need database models. Shipping the read surface first is
 * deliberate — the lease library's mechanism was built and left unplugged for
 * months, and a page you can look at is what makes that visible.
 *
 * ADMIN-GATED IN THE LOADER as well as by the layout, for the reason
 * `/admin/mca` gives: the layout's check runs for the route group, but a loader
 * that fetches before it resolves would still read.
 *
 * No organisation is resolved and no database is touched. The whole page is a
 * function of files committed to this repository.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await getSession(request);

  if (!isAdmin(user)) {
    throw new Response('Not Found', { status: 404 });
  }

  return buildMcaLibraryView();
}

const SOURCE_LABEL: Record<SourceState, string> = {
  verified: 'Source unchanged',
  'digest-moved': 'Source has changed — re-vendor needed',
  'source-missing': 'Source not readable here',
};

/*
  NO GREEN FOR ANYTHING BUT `verified`, and amber rather than red for
  `source-missing`.

  A moved digest is the loudest thing this page can say: the document was edited
  in `lombard-contracts` and every clause below it may be quoting a superseded
  sentence. A missing source is different in kind — the evidence is absent from
  this environment, which is a deployment fact and not a defect in the text.
  Colouring them the same would teach a reader to ignore both.
*/
const SOURCE_VARIANT: Record<SourceState, 'default' | 'secondary' | 'destructive'> = {
  verified: 'default',
  'digest-moved': 'destructive',
  'source-missing': 'secondary',
};

const COUNTERPARTY_LABEL: Record<string, string> = {
  merchant: 'Merchant',
  'iso-partner': 'ISO partner',
  processor: 'Processor',
};

const InstrumentCard = ({
  instrument,
  clauses,
}: {
  instrument: McaLibraryInstrumentView;
  clauses: McaLibraryClauseView[];
}) => (
  <section className="mt-6 rounded-lg border border-border">
    <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-border border-b px-4 py-3">
      <ScrollText className="h-4 w-4 shrink-0 text-muted-foreground" />
      <h2 className="font-medium text-foreground">{instrument.title}</h2>
      <Badge variant="secondary">{COUNTERPARTY_LABEL[instrument.counterparty] ?? instrument.counterparty}</Badge>
      <span className="text-muted-foreground text-sm">{instrument.entity}</span>
      <span className="ml-auto flex items-center gap-2">
        <Badge variant={SOURCE_VARIANT[instrument.sourceState]}>{SOURCE_LABEL[instrument.sourceState]}</Badge>
        <span className="text-muted-foreground text-sm">
          {instrument.clauseCount} clauses · {instrument.outstanding} outstanding
        </span>
      </span>
    </header>

    <table className="w-full text-sm">
      <thead className="border-border border-b text-left text-muted-foreground">
        <tr>
          <th className="w-24 px-4 py-2 font-normal">
            <Trans>Number</Trans>
          </th>
          <th className="px-4 py-2 font-normal">
            <Trans>Clause</Trans>
          </th>
          <th className="w-56 px-4 py-2 font-normal">
            <Trans>Read by</Trans>
          </th>
          <th className="w-32 px-4 py-2 font-normal">
            <Trans>Outstanding</Trans>
          </th>
        </tr>
      </thead>
      <tbody>
        {clauses.map((clause) => (
          <tr key={clause.slug} className="border-border/60 border-b align-top last:border-0">
            {/*
              The number the DOCUMENT prints, and an em dash where it prints
              none. Fourteen FRPA clauses are unnumbered — the granting clause
              among them — and inventing numbers for them here would put text on
              the page that is not in the contract.
            */}
            <td className="px-4 py-2 font-mono text-muted-foreground text-xs">{clause.number || '—'}</td>
            <td className="px-4 py-2">
              <div className="text-foreground">{clause.heading || clause.slug}</div>
              <div className="text-muted-foreground text-xs">
                {clause.slug} · {clause.provenance}
              </div>
            </td>
            <td className="px-4 py-2 text-muted-foreground text-xs">
              {clause.examinedBy
                .map((entry) => `${entry.review}${entry.findings > 0 ? ` (${entry.findings})` : ''}`)
                .join(', ')}
            </td>
            <td className="px-4 py-2">
              {clause.outstanding > 0 ? (
                <Badge variant="secondary">{clause.outstanding}</Badge>
              ) : (
                <span className="text-muted-foreground text-xs">—</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </section>
);

export default function AdminMcaLibraryPage() {
  const { instruments, clauses, totals, evidence } = useLoaderData<typeof loader>();

  return (
    <div>
      <h1 className="font-semibold text-4xl">
        <Trans>MCA Clauses</Trans>
      </h1>

      <p className="mt-2 text-muted-foreground text-sm">
        <Trans>
          The negotiated agreements — our contract text, not a regulator's. Conformity for the prescribed disclosure
          forms is a separate page.
        </Trans>
      </p>

      {/*
        Stated first and plainly, because the failure mode of a page like this
        is looking reassuring. 192 clauses under headings and version numbers
        read as considered; not one of them may reach a merchant.
      */}
      <Alert className="mt-6" variant="warning">
        <Lock className="h-4 w-4" />
        <AlertTitle>
          <Trans>
            None of these {totals.clauses} clauses may be sent to a merchant, and {totals.outstanding} findings are
            outstanding
          </Trans>
        </AlertTitle>
        <AlertDescription>
          <Trans>
            Every clause is attorney-drafted with no named reviewer, so the publishing gate refuses all of them — that
            is the design, not a defect. Outstanding counts only findings nobody has acted on: {totals.findingsCited}{' '}
            were cited across the library and the rest are recorded as implemented, rejected or withdrawn in the review
            manifests.
          </Trans>
        </AlertDescription>
      </Alert>

      {evidence.sourcesMoved.length > 0 && (
        <Alert className="mt-4" variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            <Trans>
              {evidence.sourcesMoved.length} document(s) changed since these clauses were transcribed from them
            </Trans>
          </AlertTitle>
          <AlertDescription>
            <Trans>
              The clause text below may be quoting superseded sentences. Re-vendor the affected documents from
              lombard-contracts and re-earn their verification dates.
            </Trans>
          </AlertDescription>
        </Alert>
      )}

      {(!evidence.registerAvailable || evidence.sourcesMissing.length > 0) && (
        <Alert className="mt-4" variant="warning">
          <FileWarning className="h-4 w-4" />
          <AlertTitle>
            <Trans>Some evidence is not present in this environment</Trans>
          </AlertTitle>
          <AlertDescription>
            <Trans>
              What is missing cannot be checked here, so an empty result below is not a clean one. This is a deployment
              fact rather than a defect in the text.
            </Trans>
          </AlertDescription>
        </Alert>
      )}

      {instruments.map((instrument) => (
        <InstrumentCard
          key={instrument.id}
          instrument={instrument}
          clauses={clauses.filter((clause) => clause.instrument === instrument.id)}
        />
      ))}
    </div>
  );
}
