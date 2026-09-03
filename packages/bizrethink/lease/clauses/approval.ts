import { createHash } from 'node:crypto';

import type { ClauseStatus } from '../../server-only/feature-access';
import type { Clause } from './types';

/**
 * Attorney sign-off on the clause library — the gate the product waits behind.
 *
 * THE INVERSION AND ITS ONE DANGER. The library is TypeScript, so a reviewing
 * attorney cannot edit `status` in code. Approval therefore lives in the
 * database and overrides what the code says. That is the only workable shape,
 * and it creates exactly one dangerous failure:
 *
 *   If an approval survived a text change, editing a clause would silently
 *   inherit sign-off on words the attorney never read. Nothing would be red.
 *   The clause would simply start rendering as reviewed.
 *
 * That is the same shape as every other failure this repo has had — the silent
 * one. So an approval is pinned to a FINGERPRINT of the clause as approved,
 * and any change to what a signer would read lapses it back to unreviewed.
 *
 * Deliberately fail-closed in both directions: no approval means draft, and a
 * lapsed approval means draft. Nothing here can make a clause more publishable
 * than the code already says it is, except a current, attributed approval.
 */

export type ClauseApproval = {
  clauseSlug: string;
  clauseVersion: number;
  /** `clauseFingerprint` of the clause as it stood when approved. */
  fingerprint: string;
  /** Who signed off. Empty is not a reviewer. */
  approvedByName: string;
  /** Bar number, for a record that means something later. */
  approvedByBarNumber: string | null;
  approvedAt: Date;
  notes: string | null;
};

/**
 * What was approved, reduced to a hash.
 *
 * Covers everything that changes what a signer reads or when they read it:
 * the words, the heading above them, the version, and the condition that
 * decides whether the clause appears at all — an attorney approved this text
 * FOR these circumstances.
 *
 * Deliberately excludes presentation-only fields. `sortKey` moves a clause
 * within its section without changing a word anybody agreed to, and lapsing an
 * approval over it would train a reviewer to re-approve without reading, which
 * is worse than not lapsing at all.
 *
 * `includeWhen` is a function, so it is fingerprinted by source text. Crude,
 * and correct in the direction that matters: a rewrite that changes nothing
 * semantically still lapses the approval, and a semantic change can never
 * slip through unnoticed.
 */
export const clauseFingerprint = (clause: Clause): string =>
  createHash('sha256')
    .update(
      JSON.stringify({
        slug: clause.slug,
        version: clause.version,
        jurisdiction: clause.jurisdiction,
        placement: clause.placement,
        section: clause.section,
        heading: clause.heading,
        body: clause.body,
        requiredBy: clause.requiredBy ?? null,
        includeWhen: clause.includeWhen === null ? null : clause.includeWhen.toString(),
        variables: clause.variables,
        supersedes: clause.supersedes,
        asserts: clause.asserts,
      }),
    )
    .digest('hex');

/** Does this approval still describe this clause? */
export const isApprovalCurrent = (clause: Clause, approval: ClauseApproval | null): boolean => {
  if (!approval) {
    return false;
  }

  if (approval.clauseSlug !== clause.slug) {
    return false;
  }

  // An unattributed approval is the state this feature exists to leave.
  if (approval.approvedByName.trim() === '') {
    return false;
  }

  return approval.fingerprint === clauseFingerprint(clause);
};

/**
 * The status that actually governs, code and approval combined.
 *
 * `retired` always wins: retired means superseded, and nothing should ever
 * render it again regardless of what an approval says.
 */
export const effectiveClauseStatus = (clause: Clause, approval: ClauseApproval | null): ClauseStatus => {
  if (clause.status === 'retired') {
    return 'retired';
  }

  if (clause.status === 'published') {
    return 'published';
  }

  return isApprovalCurrent(clause, approval) ? 'published' : 'draft';
};

/**
 * Which of these clauses still lack a current approval.
 *
 * The answer to "what is standing between this library and a real tenant",
 * and the list an attorney works through.
 */
export const unapprovedSlugs = (clauses: Clause[], approvals: ClauseApproval[]): string[] => {
  const bySlug = new Map(approvals.map((approval) => [approval.clauseSlug, approval]));

  return clauses
    .filter((clause) => effectiveClauseStatus(clause, bySlug.get(clause.slug) ?? null) !== 'published')
    .map((clause) => clause.slug);
};

/**
 * A fingerprint of the whole library, for pinning a counsel link.
 *
 * `clauseFingerprint` answers "has THIS clause changed since it was approved".
 * This answers "has ANY of it changed since the link was sent" — which is what
 * a reviewer opening a link days later needs to know, because they were sent a
 * document, not a clause.
 */
export const libraryFingerprint = (clauses: Clause[]): string =>
  createHash('sha256')
    .update(
      clauses
        .map((clause) => clauseFingerprint(clause))
        .sort()
        .join('\n'),
    )
    .digest('hex');
