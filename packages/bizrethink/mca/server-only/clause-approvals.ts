import { prisma } from '@documenso/prisma';

import type { McaClauseApproval } from '../clauses/approval';
import type { McaInstrument } from '../clauses/instruments';
import type { McaJurisdiction } from '../jurisdictions';

/**
 * Loading attorney sign-off, and nothing else.
 *
 * The only place the database meets the MCA clause library. Everything that
 * DECIDES anything lives in `clauses/approval.ts` and is pure; this reads rows
 * and hands them over. That split is what let the whole mechanism be asserted
 * before a single table existed, which matters here more than usual: there is
 * no local database (docs/STATE.md, *Blocked*), so a rule that could only be
 * checked by running a query could not be checked at all.
 */

/**
 * Current approvals, keyed by clause slug.
 *
 * SUPERSEDED ROWS ARE EXCLUDED HERE, AND THAT IS CONVENIENCE RATHER THAN
 * SAFETY. `isMcaApprovalCurrent` re-checks the fingerprint, the instrument and
 * the attribution, so a stale row that slipped through would still be treated
 * as no approval. Two independent reasons a lapsed approval cannot publish a
 * clause, which is the right number for the only thing standing between this
 * library and a merchant.
 *
 * KEYED BY SLUG ALONE, WHICH IS SAFE ONLY BECAUSE OF WHERE IT READS FROM.
 * `mca/clauses/README.md` rule 7 records what slug-keying cost the lease
 * library — "one attorney approval hid another's" — and the defence is that
 * MCA slugs are globally unique across instruments AND that this reads the MCA
 * table rather than a table shared with another vertical. The row's own
 * `instrument` is checked by `isMcaApprovalCurrent` regardless, so a slug
 * collision could at worst hide an approval, never transplant one.
 */
export const loadMcaClauseApprovals = async (): Promise<Map<string, McaClauseApproval>> => {
  const rows = await prisma.bizrethinkMcaClauseApproval.findMany({
    where: { supersededAt: null },
    orderBy: { approvedAt: 'desc' },
  });

  const bySlug = new Map<string, McaClauseApproval>();

  for (const row of rows) {
    // Newest first, so the first row seen for a slug is the one that counts.
    if (bySlug.has(row.clauseSlug)) {
      continue;
    }

    bySlug.set(row.clauseSlug, {
      clauseSlug: row.clauseSlug,
      clauseVersion: row.clauseVersion,
      /*
        Cast at the boundary, in one place. Prisma has no enum for either of
        these — they are the library's vocabulary, not the database's — and the
        alternative is a `string` leaking through every consumer until somebody
        compares it to an `McaInstrument` and the comparison silently never
        fires. A row carrying a value outside the union fails
        `isMcaApprovalCurrent`, which is the safe direction.
      */
      instrument: row.instrument as McaInstrument,
      barJurisdiction: row.barJurisdiction as McaJurisdiction,
      fingerprint: row.fingerprint,
      approvedByName: row.approvedByName,
      approvedByBarNumber: row.approvedByBarNumber,
      recordedByUserId: row.recordedByUserId,
      approvedAt: row.approvedAt,
      notes: row.notes,
    });
  }

  return bySlug;
};
