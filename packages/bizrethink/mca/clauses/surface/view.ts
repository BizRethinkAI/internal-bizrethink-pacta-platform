import { assertPublishable } from '../../../provenance/types';
import { type ReviewMcaContent, reusableForReview } from '../../reusable/review';
import { numberedLibraryForReview, reviewProfileDescription } from '../../review/numbered-library';
import { agreementDigest, agreementExists, MissingAgreementError } from '../documents';
import { findingsFor, outstandingFindingsFor, REGISTER_AVAILABLE } from '../examination';
import { INSTRUMENTS, MCA_INSTRUMENTS, type McaInstrument } from '../instruments';
import { LOMBARD, type McaTenant } from '../parties';
import type { ClauseVariance, McaContent, McaContentUse, McaReusableContent, WhyThisClause } from '../types';

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

export type McaLibraryRecordView = {
  slug: string;
  instrument: McaInstrument;
  number: string | null;
  kind: McaContent['kind'];
  uses: McaContentUse[];
  body: string;
  fields: McaContent['fields'];
  repeatFor: McaContent['repeatFor'];
  retiredFields: McaContent['retiredFields'];
  included: boolean;
  selectionNote: string | null;
  heading: string;
  section: string;
  status: string;
  provenance: string;
  whyThisClause: WhyThisClause;
  variance: ClauseVariance;
  /** Why this clause may not be published. Empty would mean it could be. */
  publishProblems: string[];
  examinedBy: { review: string; findings: number }[];
  findings: McaLibraryFindingView[];
  outstanding: number;
};

export type McaLibraryClauseView = McaLibraryRecordView & { kind: 'clause'; number: string };
export type McaLibraryReusableView = McaLibraryRecordView & { kind: McaReusableContent['kind']; number: null };

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

/** One evidence projection shared by two disjoint catalogues. */
const recordView = (clause: ReviewMcaContent): McaLibraryRecordView => {
  const outstanding = new Set(outstandingFindingsFor(clause).map((finding) => finding.id));
  return {
    slug: clause.slug,
    instrument: clause.instrument,
    number: clause.number,
    kind: clause.kind,
    uses: clause.kind === 'clause' ? ['document', 'template'] : clause.uses,
    body: clause.body,
    fields: clause.fields,
    repeatFor: clause.repeatFor,
    retiredFields: clause.retiredFields,
    included: clause.included,
    selectionNote: clause.selectionNote,
    heading: clause.heading,
    section: clause.section,
    status: clause.status,
    provenance: describeSource(clause.source),
    whyThisClause: clause.whyThisClause,
    variance: clause.variance,
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
};

const instrumentViews = (rows: McaLibraryRecordView[], tenant: McaTenant): McaLibraryInstrumentView[] =>
  MCA_INSTRUMENTS.map((id) => {
    const mine = rows.filter((entry) => entry.instrument === id);
    return {
      id,
      title: INSTRUMENTS[id].title,
      counterparty: INSTRUMENTS[id].counterparty,
      clauseCount: mine.filter((entry) => entry.kind === 'clause').length,
      outstanding: new Set(
        mine.flatMap((entry) => entry.findings.filter((finding) => finding.outstanding).map((finding) => finding.id)),
      ).size,
      sourceDocument: tenant.documents[id]?.file ?? '',
      bodiesVerifiedAt: tenant.documents[id]?.bodiesVerifiedAt ?? null,
      sourceState: sourceState(id, tenant),
    };
  });

const totalsFor = (rows: McaLibraryRecordView[]) => ({
  findingsCited: new Set(rows.flatMap((entry) => entry.findings.map((finding) => finding.id))).size,
  outstanding: new Set(
    rows.flatMap((entry) => entry.findings.filter((finding) => finding.outstanding).map((finding) => finding.id)),
  ).size,
  publishable: rows.filter((entry) => entry.publishProblems.length === 0).length,
});

const evidenceFor = (instruments: McaLibraryInstrumentView[]) => ({
  registerAvailable: REGISTER_AVAILABLE,
  sourcesMissing: instruments.filter((entry) => entry.sourceState === 'source-missing').map((entry) => entry.id),
  sourcesMoved: instruments.filter((entry) => entry.sourceState === 'digest-moved').map((entry) => entry.id),
});

export const mcaLibrarySurface = (tenant: McaTenant = LOMBARD) => {
  const clauses: McaLibraryClauseView[] = MCA_INSTRUMENTS.flatMap((instrument) =>
    numberedLibraryForReview(instrument),
  ).map((clause) => ({ ...recordView(clause), kind: 'clause', number: clause.number }));
  const instruments = instrumentViews(clauses, tenant);
  return {
    reviewProfile: reviewProfileDescription(),
    instruments,
    clauses,
    totals: { clauses: clauses.length, ...totalsFor(clauses) },
    evidence: evidenceFor(instruments),
  };
};

export const mcaReusableSurface = (tenant: McaTenant = LOMBARD) => {
  const items: McaLibraryReusableView[] = MCA_INSTRUMENTS.flatMap((instrument) => reusableForReview(instrument)).map(
    (entry) => ({ ...recordView(entry), kind: entry.kind, number: null }),
  );
  const instruments = instrumentViews(items, tenant);
  return {
    reviewProfile: reviewProfileDescription(),
    instruments,
    items,
    totals: { items: items.length, ...totalsFor(items) },
    evidence: evidenceFor(instruments),
  };
};
