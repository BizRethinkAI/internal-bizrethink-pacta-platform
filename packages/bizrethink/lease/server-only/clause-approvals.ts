import { prisma } from '@documenso/prisma';
import type { ClauseStatus } from '../../server-only/feature-access';
import type { ClauseApproval } from '../clauses/approval';
import { effectiveClauseStatus } from '../clauses/approval';
import type { Clause } from '../clauses/types';

/**
 * Loading attorney sign-off, and applying it to the library.
 *
 * The only place the database meets the clause library. Everything that
 * decides anything lives in `clauses/approval.ts` and is pure; this reads rows
 * and hands them over.
 */

/**
 * Current approvals, keyed by slug.
 *
 * Superseded rows are excluded here, but that is convenience rather than
 * safety — `effectiveClauseStatus` re-checks the fingerprint, so a stale row
 * that slipped through would still be treated as no approval. Two independent
 * reasons a lapsed approval cannot publish a clause.
 */
export const loadClauseApprovals = async (): Promise<Map<string, ClauseApproval>> => {
  const rows = await prisma.bizrethinkClauseApproval.findMany({
    where: { supersededAt: null },
    orderBy: { approvedAt: 'desc' },
  });

  const bySlug = new Map<string, ClauseApproval>();

  for (const row of rows) {
    // Newest first, so the first row seen for a slug is the one that counts.
    if (bySlug.has(row.clauseSlug)) {
      continue;
    }

    bySlug.set(row.clauseSlug, {
      clauseSlug: row.clauseSlug,
      clauseVersion: row.clauseVersion,
      fingerprint: row.fingerprint,
      approvedByName: row.approvedByName,
      approvedByBarNumber: row.approvedByBarNumber,
      approvedAt: row.approvedAt,
      notes: row.notes,
    });
  }

  return bySlug;
};

/** The status that governs: what the code says, overridden by a current approval. */
export const statusWithApproval = (clause: Clause, approvals: Map<string, ClauseApproval>): ClauseStatus =>
  effectiveClauseStatus(clause, approvals.get(clause.slug) ?? null);
