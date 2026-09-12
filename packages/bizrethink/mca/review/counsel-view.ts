import { isMcaApprovalCurrent, type McaClauseApproval } from '../clauses/approval';
import { INSTRUMENTS } from '../clauses/instruments';
import { libraryFor } from '../clauses/library';
import { type McaTenant, resolveClauses } from '../clauses/parties';
import type { McaJurisdiction } from '../jurisdictions';
import { type BriefingSection, counselBriefing } from './briefing';
import { type McaLibraryReview, reviewIsStale } from './link';
import { numberedLibraryForReview } from './numbered-library';
import { type ReadableMcaClause, toReadableAgreement } from './readable-agreement';

/**
 * Everything a reviewing attorney is sent, in one object — and the reason it is
 * a function rather than the body of a tRPC procedure.
 *
 * EXTRACTED FROM `openLibrary` SO THAT A PROPERTY CAN BE STATED OVER IT. The
 * payload was an object literal inside a procedure, so asserting anything about
 * what counsel sees needed a database — and so nothing did. 2,476 tests were
 * green while this page rendered the two adversarial DOCUMENT reviews' findings
 * as annotations beside each clause, which
 * [ADR 0012](../../../../docs/adr/0012-the-baseline-document-is-input-not-specification.md)
 * had decided on 2026-09-10 must stop: *"they stop being shown to a reviewing
 * attorney as annotations on the product."* The defects were found by the owner
 * opening the link.
 *
 * They had by then gone stale in the worst available way. They audited
 * `Lombard_FRPA_v4`; every FRPA clause has since been rewritten. Under §2.1 the
 * clause now says the merchant makes **no** representation as to fair market
 * value, and the note beneath it said §2.1 *makes the merchant agree* that the
 * price equals fair market value. Two of them named an internal working paper by
 * filename and told outside counsel our own entity records were unverified.
 *
 * `__tests__/counsel-surface.test.ts` now walks every string in this value, for
 * all six agreements, and says what may not be in any of them. A property that
 * can only be stated about one agreement is the one that misses the seventh.
 *
 * WHAT THE ROUTER STILL OWNS: the token, the row, whether the link is usable,
 * the approvals and who sent it. Those need a database. Nothing here does.
 */

export type CounselReviewClause = ReadableMcaClause & {
  /**
   * Why the clause is in the document, where a state's law put it there. Most
   * of this corpus is commercial drafting and says nothing here — and saying so
   * is the point: it tells a lawyer where their hour is worth spending.
   */
  requiredBy: string | null;
  appliesInStates: McaJurisdiction[];
  /**
   * Whether somebody's approval already covers these exact words. Read by an
   * attorney deciding whether the clause still needs her, so it has to mean
   * "current", not "approved once, at some point".
   */
  approved: boolean;

  /*
    AND NOTHING ELSE. The two document reviews' findings were shipped here, one
    array per clause, and painted under the clause they name. ADR 0012 decided
    they are drafting input and stop being shown to a reviewing attorney; they
    are not sent rather than sent and hidden, because a field the page declines
    to paint is still in the JSON the browser holds and still readable by anyone
    with the link. `counsel-surface.test.ts` pins this key set so the next field
    added here has to be a decision.
  */
};

export type CounselReviewSection = {
  id: string;
  name: string;
  clauses: CounselReviewClause[];
};

export type CounselReviewView = {
  reviewerName: string;
  instrument: { id: string; title: string; counterparty: string };
  /** Whose paper the reviewer is reading. A tenant fact, not a library one. */
  parties: Record<string, string>;
  /**
   * A clause has changed since the link was sent.
   *
   * KEPT, AND DELIBERATELY NOT WEAKENED. The reviewer is told rather than left
   * to discover that the words in front of her are not the words that were
   * meant to reach her when she was briefed.
   */
  agreementMoved: boolean;
  briefing: BriefingSection[];
  sections: CounselReviewSection[];
};

export type CounselReviewInput = {
  review: McaLibraryReview;
  /** Whose paper. The view names real parties, never `{{funder}}`. */
  tenant: McaTenant;
  /** Every current approval, by clause slug. */
  approvals: Map<string, McaClauseApproval>;
  /** Who minted the link. Null when the row no longer resolves to a person. */
  sender: { name: string; email: string } | null;
  now: Date;
};

export const counselReviewView = (input: CounselReviewInput): CounselReviewView => {
  const { review, tenant, approvals, sender, now } = input;

  const clauses = libraryFor(review.instrument);
  const instrument = INSTRUMENTS[review.instrument];

  const approvalFor = (slug: string) => approvals.get(slug) ?? null;

  return {
    reviewerName: review.reviewerName,
    instrument: {
      id: instrument.id,
      title: instrument.title,
      counterparty: instrument.counterparty,
    },
    parties: tenant.parties,
    agreementMoved: reviewIsStale(review, clauses),
    /*
      THE COUNTS COME FROM THE SAME LIST THE PAGE RENDERS, so the briefing
      cannot claim a number the clauses below contradict. That was not
      hypothetical: it told every reader that "forty clauses across the library
      carry no number", which is the count of clauses carrying no HEADING.
    */
    briefing: counselBriefing({
      instrument: review.instrument,
      tenant,
      clauseCount: clauses.length,
      approvedCount: clauses.filter((clause) => isMcaApprovalCurrent(clause, approvalFor(clause.slug))).length,
      unnumberedCount: clauses.filter((clause) => clause.unnumberedReason).length,
      sender,
      expiresAt: review.expiresAt,
      now,
    }),
    sections: toReadableAgreement(resolveClauses(numberedLibraryForReview(review.instrument), tenant)).map(
      (section) => ({
        ...section,
        clauses: section.clauses.map((readable) => {
          const clause = clauses.find((candidate) => candidate.slug === readable.slug);

          return {
            ...readable,
            requiredBy: clause?.requiredBy ?? null,
            appliesInStates: clause?.appliesInStates ?? [],
            approved: clause === undefined ? false : isMcaApprovalCurrent(clause, approvalFor(clause.slug)),
          };
        }),
      }),
    ),
  };
};
