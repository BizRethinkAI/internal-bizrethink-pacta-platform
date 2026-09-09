import { assertPublishable } from '../../../provenance/types';
import { agreementDigest, agreementExists, MissingAgreementError } from '../documents';
import { findingsFor, outstandingFindingsFor, REGISTER_AVAILABLE } from '../examination';
import { INSTRUMENTS, MCA_INSTRUMENTS, type McaInstrument } from '../instruments';
import { ALL_MCA_CLAUSES, inReviewOrder } from '../library';
import { LOMBARD, type McaTenant } from '../parties';

/**
 * The view model behind `/admin/mca-library`.
 *
 * SERVER ONLY, AND NOT BY CONVENTION. This module reaches `node:fs` through
 * `examination.ts` and `documents.ts`, so importing it into a route module
 * breaks the CLIENT build — which is how `/admin/mca` learned the same lesson:
 * its first attempt relied on tree-shaking to keep `node:path` out of the
 * browser bundle, and relying on an optimisation for correctness does not work.
 * Reach it through `apps/remix/app/utils/bizrethink-mca-library.server.ts`.
 *
 * WHAT THIS PAGE IS FOR. Until it existed, nothing in the running application
 * imported `mca/clauses/` at all: 192 clauses sat on `main`, reachable by
 * nobody. A library nobody can look at cannot be reviewed, and review is the
 * only thing standing between these clauses and a merchant.
 *
 * WHAT IT IS NOT. No approval, no review link, no mutation of any kind. Those
 * need database models and are the next piece of work. Shipping the read
 * surface first is deliberate: the lease library's equivalent went months with
 * an approval mechanism nothing had plugged in.
 */

/** Whether the vendored agreement still matches what the clause bodies were taken from. */
export type SourceState =
  /** The digest matches. The bodies are the words the document ships. */
  | 'verified'
  /**
   * The document changed since these bodies were transcribed.
   *
   * NOT A BUG IN THIS PACKAGE — the mechanism working. Somebody edited the
   * `.docx` in `lombard-contracts` and the library has not been re-vendored, so
   * this instrument's clauses may be quoting superseded sentences.
   */
  | 'digest-moved'
  /**
   * The vendored text is not present in this environment.
   *
   * Expected in the container unless `docker/Dockerfile` copies
   * `mca/clauses/source-documents/`. Reported rather than hidden, because an
   * empty finding list and an unreadable one look identical on a page.
   */
  | 'source-missing';

export type McaLibraryFindingView = {
  id: string;
  review: string;
  severity: string;
  disposition: string;
  decides: string;
  finding: string;
  outstanding: boolean;
};

export type McaLibraryClauseView = {
  slug: string;
  instrument: McaInstrument;
  number: string;
  heading: string;
  section: string;
  status: string;
  provenance: string;
  /** Why this clause may not be published. Empty would mean it could be. */
  publishProblems: string[];
  examinedBy: { review: string; findings: number }[];
  findings: McaLibraryFindingView[];
  outstanding: number;
};

export type McaLibraryInstrumentView = {
  id: McaInstrument;
  title: string;
  counterparty: string;
  clauseCount: number;
  outstanding: number;
  sourceDocument: string;
  bodiesVerifiedAt: string | null;
  sourceState: SourceState;
};

const describeSource = (source: { kind: string; author?: string | null }): string =>
  source.kind === 'attorney-drafted'
    ? source.author
      ? `Attorney-drafted — ${source.author}`
      : 'Attorney-drafted — no named reviewer'
    : source.kind;

/*
  THE DOCUMENT IS THE TENANT'S, NOT THE INSTRUMENT'S. "The Future Receivables
  Purchase Agreement" is a kind of document; the file, its digest and the date
  its bodies were read are facts about ONE client's paper. Reading them off the
  instrument is what made this library single-tenant while every test passed.
*/
const sourceState = (id: McaInstrument, tenant: McaTenant): SourceState => {
  const doc = tenant.documents[id];

  if (doc === undefined || doc.bodiesVerifiedAt === null || !agreementExists(doc.file)) {
    return 'source-missing';
  }

  try {
    return agreementDigest(doc.file) === doc.digest ? 'verified' : 'digest-moved';
  } catch (error) {
    if (error instanceof MissingAgreementError) {
      return 'source-missing';
    }

    throw error;
  }
};

export const mcaLibrarySurface = (tenant: McaTenant = LOMBARD) => {
  const clauses: McaLibraryClauseView[] = inReviewOrder(ALL_MCA_CLAUSES).map((clause) => {
    const outstanding = new Set(outstandingFindingsFor(clause).map((finding) => finding.id));

    return {
      slug: clause.slug,
      instrument: clause.instrument,
      number: clause.number,
      heading: clause.heading,
      section: clause.section,
      status: clause.status,
      provenance: describeSource(clause.source),
      /*
        Computed against a HYPOTHETICAL published copy, not the draft in hand.

        `assertPublishable` returns nothing for a draft — correctly, since a
        draft is not published — so asking it about the clause as it stands
        would report no problems for all 192 and the page would read as though
        the library were ready. What a reader needs is what WOULD stop each
        clause reaching a merchant, which is the question the gate answers.
      */
      publishProblems: assertPublishable({ ...clause, status: 'published' }),
      examinedBy: clause.examinedBy.map((entry) => ({ review: entry.review, findings: entry.findings.length })),
      findings: findingsFor(clause).map((finding) => ({
        id: finding.id,
        review: finding.review,
        severity: finding.severity ?? 'refuted',
        disposition: finding.disposition,
        decides: finding.decides ?? '—',
        finding: finding.finding,
        outstanding: outstanding.has(finding.id),
      })),
      outstanding: outstanding.size,
    };
  });

  const instruments: McaLibraryInstrumentView[] = MCA_INSTRUMENTS.map((id) => {
    const mine = clauses.filter((clause) => clause.instrument === id);

    return {
      id,
      title: INSTRUMENTS[id].title,
      counterparty: INSTRUMENTS[id].counterparty,
      clauseCount: mine.length,
      outstanding: new Set(mine.flatMap((c) => c.findings.filter((f) => f.outstanding).map((f) => f.id))).size,
      sourceDocument: tenant.documents[id]?.file ?? '',
      bodiesVerifiedAt: tenant.documents[id]?.bodiesVerifiedAt ?? null,
      sourceState: sourceState(id, tenant),
    };
  });

  return {
    instruments,
    clauses,
    totals: {
      clauses: clauses.length,
      findingsCited: new Set(clauses.flatMap((c) => c.findings.map((f) => f.id))).size,
      outstanding: new Set(clauses.flatMap((c) => c.findings.filter((f) => f.outstanding).map((f) => f.id))).size,
      /** Deliberately expected to be zero. See `__tests__/surface.test.ts`. */
      publishable: clauses.filter((clause) => clause.publishProblems.length === 0).length,
    },
    evidence: {
      registerAvailable: REGISTER_AVAILABLE,
      sourcesMissing: instruments.filter((e) => e.sourceState === 'source-missing').map((e) => e.id),
      sourcesMoved: instruments.filter((e) => e.sourceState === 'digest-moved').map((e) => e.id),
    },
  };
};
