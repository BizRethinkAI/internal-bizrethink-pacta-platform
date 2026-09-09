import { prisma } from '@documenso/prisma';

import { assertPublishable } from '../../provenance/types';
import {
  approvedMcaClause,
  findingsHold,
  isMcaApprovalCurrent,
  type McaClauseApproval,
  mcaClauseFingerprint,
  statesNotCovered,
} from '../clauses/approval';
import { outstandingFindingsFor, REGISTER_AVAILABLE } from '../clauses/examination';
import type { McaInstrument } from '../clauses/instruments';
import { ALL_MCA_CLAUSES, libraryFor } from '../clauses/library';
import { LOMBARD, resolveClauses } from '../clauses/parties';
import { type McaLibraryClauseView, mcaLibrarySurface } from '../clauses/surface/view';
import type { McaJurisdiction } from '../jurisdictions';
import { isMcaReviewUsable, type McaLibraryReview, reviewIsStale } from '../review/link';
import { loadMcaClauseApprovals } from './clause-approvals';

/**
 * Everything `/admin/mca-library` renders, in one read.
 *
 * WHY THIS IS NOT A tRPC QUERY LIKE THE LEASE LIBRARY'S. That page fetches its
 * clauses over tRPC and its share links over a second tRPC call, and its loader
 * exists only to resolve an organisation it then apologises for in a comment.
 * This page has no organisation to resolve, and its clause list is a function
 * of files committed to this repository plus one table. A loader is the simpler
 * shape, and mutations revalidate it — which means there is exactly one place
 * the page's data comes from, and no way for the list and the approval badges
 * to disagree because one refetched and the other did not.
 *
 * SERVER ONLY, AND NOT BY CONVENTION. This reaches `node:fs` through
 * `mcaLibrarySurface`, so a route module must come at it through a `.server.ts`
 * file. Importing it into the route and using it only in `loader` puts
 * `node:fs` in the CLIENT bundle and fails the build; that is how PR #118 first
 * went red, and relying on the bundler's dead-code elimination is relying on an
 * optimisation for correctness.
 */

export type McaLibraryApprovalView = {
  /** Whose authority the approval claims. */
  approvedByName: string;
  approvedByBarNumber: string | null;
  barJurisdiction: string;
  /**
   * Who typed it, which is somebody else.
   *
   * Surfaced rather than stored and forgotten. The page says "recorded by X
   * under the authority of Y" because that is what happened, and a page that
   * printed only the attorney would be describing a signature nobody made.
   */
  recordedByName: string;
  approvedAt: string;
  notes: string | null;
  /**
   * The approval exists but no longer matches the clause.
   *
   * SHOWN RATHER THAN HIDDEN. "It was approved, then the wording moved" is the
   * useful thing to know, and it is the mechanism working rather than failing.
   */
  lapsed: boolean;
  /**
   * States this clause is in the agreement for that this admission says nothing
   * about. Empty for almost every clause; ISO PRA §2.6 is the case that is not.
   */
  statesNotCovered: McaJurisdiction[];
};

export type McaLibraryPageClause = McaLibraryClauseView & {
  /**
   * The clause's words, verbatim.
   *
   * NOT ON THE READ-ONLY SURFACE, AND REQUIRED HERE. `mcaLibrarySurface` sends
   * headings and provenance because a page nobody can act on only has to show
   * what exists. An approval is of THE EXACT WORDS — that is the whole of what
   * the fingerprint pins — so a page that records one without showing them
   * would be collecting sign-off on text the approver never saw.
   *
   * It is the largest thing on the payload by far, and admin-only, which is the
   * trade being made rather than an oversight.
   */
  body: string;
  /** Sent back with an approval, so sign-off cannot be attributed to unseen words. */
  fingerprint: string;
  appliesInStates: McaJurisdiction[];
  approval: McaLibraryApprovalView | null;
  /** A current approval covering these exact words. */
  approved: boolean;
  /**
   * Why an approval cannot be recorded right now, findings aside from
   * admission — shown on the row rather than discovered on submit. The router
   * refuses either way, but a refusal after somebody has typed a name, a bar
   * number and a jurisdiction is a worse way to learn it.
   */
  heldByFindings: string | null;
};

export type McaLibraryReviewView = {
  id: string;
  token: string;
  status: string;
  reviewerName: string;
  reviewerEmail: string;
  instrument: McaInstrument;
  expiresAt: string | null;
  createdAt: string;
  /** Still openable — live, and not expired. */
  usable: boolean;
  /** The agreement moved after the link went out. */
  stale: boolean;
};

const BY_SLUG = new Map(ALL_MCA_CLAUSES.map((clause) => [clause.slug, clause]));

const approvalView = (
  approval: McaClauseApproval,
  clause: (typeof ALL_MCA_CLAUSES)[number],
  recordedByName: string,
): McaLibraryApprovalView => ({
  approvedByName: approval.approvedByName,
  approvedByBarNumber: approval.approvedByBarNumber,
  barJurisdiction: approval.barJurisdiction,
  recordedByName,
  approvedAt: approval.approvedAt.toISOString(),
  notes: approval.notes,
  lapsed: !isMcaApprovalCurrent(clause, approval),
  statesNotCovered: statesNotCovered(clause, approval.barJurisdiction),
});

/**
 * A finding counsel recorded through a review link, as staff see it.
 *
 * SEPARATE FROM THE VENDORED REGISTER `outstandingFindingsFor` READS, and shown
 * separately on both pages. That one holds the two adversarial document
 * reviews, whose dispositions live in `lombard-contracts` manifests and are
 * cleared by editing a manifest and re-vendoring. These arrive on a link, are
 * attributable to the reviewer named on it, and are cleared with a sentence
 * typed here. One register per origin, each labelled — the objection to a
 * second register was that two copies of the SAME findings drift, and no
 * manifest has ever held one of these.
 */
export type McaCounselFindingView = {
  id: string;
  clauseSlug: string;
  /** Resolved to the heading counsel actually read, or the slug when unheaded. */
  clauseLabel: string;
  instrument: McaInstrument | null;
  body: string;
  authorName: string;
  reviewerName: string;
  answeredAt: string | null;
  answer: string | null;
  createdAt: string;
  /**
   * Whether the clause has moved since she read it.
   *
   * An answer to a finding against text that has since changed is an answer to
   * a different question, and the person typing it is the one who needs to know
   * that before they type it.
   */
  clauseMoved: boolean;
};

export const mcaLibraryPage = async () => {
  const surface = mcaLibrarySurface();
  const approvals = await loadMcaClauseApprovals();

  /*
    The staff members who recorded them, by id. One query rather than one per
    row, and a missing user degrades to their id rather than to an empty string:
    a deleted account is still a record of who typed it, and blank reads as
    "nobody", which is the one thing it definitely was not.
  */
  const recorders = await prisma.user.findMany({
    where: { id: { in: [...new Set([...approvals.values()].map((approval) => approval.recordedByUserId))] } },
    select: { id: true, name: true, email: true },
  });

  const recorderName = (id: number): string => {
    const user = recorders.find((candidate) => candidate.id === id);

    return user?.name ?? user?.email ?? `user ${id}`;
  };

  const clauses: McaLibraryPageClause[] = surface.clauses.map((view) => {
    const clause = BY_SLUG.get(view.slug);

    /*
      Cannot happen — `mcaLibrarySurface` maps the same array this index is
      built from — and is handled rather than asserted, because a page that
      throws on one misfiled clause hides the other two hundred.
    */
    if (clause === undefined) {
      return {
        ...view,
        body: '',
        fingerprint: '',
        appliesInStates: [],
        approval: null,
        approved: false,
        heldByFindings: null,
      };
    }

    const approval = approvals.get(clause.slug) ?? null;
    const effective = approvedMcaClause(clause, approval);

    return {
      ...view,
      /*
        RECOMPUTED WITH THE APPROVAL APPLIED. The surface computes this against
        a hypothetical published copy of the clause AS WRITTEN, which is right
        for a page with no approvals and wrong the moment there is one. Both
        run through `assertPublishable`; the only difference is whether the
        author the approval supplies is in the clause handed to it.
      */
      publishProblems: assertPublishable({ ...effective, status: 'published' }),
      body: clause.body,
      fingerprint: mcaClauseFingerprint(clause),
      appliesInStates: clause.appliesInStates,
      approval: approval === null ? null : approvalView(approval, clause, recorderName(approval.recordedByUserId)),
      approved: isMcaApprovalCurrent(clause, approval),
      /*
        WHAT THE ROUTER WILL SAY, ASKED THROUGH THE SAME FUNCTION. Shown on the
        row rather than discovered on submit: the gate refuses either way, but a
        refusal after somebody has typed a name, a bar number and a jurisdiction
        is a worse way to learn it.

        The ADMISSION half is deliberately not asked here. Nobody has typed one
        yet, and inventing a plausible value to get an answer would be asking a
        different question and printing it as this one's.
      */
      heldByFindings: findingsHold(outstandingFindingsFor(clause), REGISTER_AVAILABLE),
    };
  });

  const rows = await prisma.bizrethinkMcaLibraryReview.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      token: true,
      status: true,
      reviewerName: true,
      reviewerEmail: true,
      instrument: true,
      libraryFingerprint: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  const now = new Date();

  const reviews: McaLibraryReviewView[] = rows.map((row) => {
    const review: McaLibraryReview = {
      id: row.id,
      token: row.token,
      status: row.status === 'closed' ? 'closed' : 'open',
      reviewerName: row.reviewerName,
      reviewerEmail: row.reviewerEmail,
      instrument: row.instrument as McaInstrument,
      libraryFingerprint: row.libraryFingerprint,
      expiresAt: row.expiresAt,
    };

    return {
      id: row.id,
      token: row.token,
      status: row.status,
      reviewerName: row.reviewerName,
      reviewerEmail: row.reviewerEmail,
      instrument: review.instrument,
      expiresAt: row.expiresAt === null ? null : row.expiresAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      usable: isMcaReviewUsable(review, now),
      stale: reviewIsStale(review, libraryFor(review.instrument)),
    };
  });

  /*
    WHAT COUNSEL SAID, FOR THE PEOPLE WHO HAVE TO ANSWER IT.

    Read here rather than over tRPC for the reason at the top of this file: one
    place the page's data comes from, so the answer form and the approval badges
    cannot disagree about whether a clause is blocked.
  */
  const findingRows = await prisma.bizrethinkMcaLibraryFinding.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      clauseSlug: true,
      body: true,
      authorName: true,
      clauseFingerprint: true,
      answeredAt: true,
      answer: true,
      createdAt: true,
      review: { select: { instrument: true, reviewerName: true } },
    },
  });

  const counselFindings: McaCounselFindingView[] = findingRows.map((row) => {
    const clause = ALL_MCA_CLAUSES.find((candidate) => candidate.slug === row.clauseSlug);
    const asRead = clause === undefined ? null : resolveClauses([clause], LOMBARD)[0];

    return {
      id: row.id,
      clauseSlug: row.clauseSlug,
      // The heading counsel read, and the slug when the document heads nothing
      // — forty clauses carry no heading at all.
      clauseLabel: asRead === null || asRead.heading === '' ? row.clauseSlug : asRead.heading,
      instrument: clause?.instrument ?? null,
      body: row.body,
      authorName: row.authorName,
      reviewerName: row.review.reviewerName,
      answeredAt: row.answeredAt === null ? null : row.answeredAt.toISOString(),
      answer: row.answer,
      createdAt: row.createdAt.toISOString(),
      /*
        A clause that has since been deleted counts as moved. It has certainly
        not stayed the same, and "unknown" is not one of the two states the
        person answering can act on.
      */
      clauseMoved: asRead === null || mcaClauseFingerprint(asRead) !== row.clauseFingerprint,
    };
  });

  return {
    ...surface,
    clauses,
    reviews,
    counselFindings,
    totals: {
      ...surface.totals,
      /*
        NOT `surface.totals.publishable`, which is pinned at zero by
        `surface.test.ts` and describes the library as written. This one is the
        number that changes when counsel works, and it is the number the page
        leads with.
      */
      publishable: clauses.filter((clause) => clause.publishProblems.length === 0).length,
      approved: clauses.filter((clause) => clause.approved).length,
    },
  };
};
