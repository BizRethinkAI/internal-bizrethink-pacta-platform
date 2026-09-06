/**
 * What an attorney said about a clause, and whether anybody answered.
 *
 * THE ASYMMETRY THIS EXISTS TO FIX. A tenant can comment on every clause of a
 * lease and have each comment tracked to a disposition. Counsel — whose review
 * is the critical path for the whole product, and without which no lease may
 * reach a third party — had a read-only page: clauses, approved/unapproved
 * badges, and no way to say anything. Findings arrived by email and somebody
 * retyped them into a system that had no place to put them.
 *
 * A FINDING IS NOT A COMMENT. A tenant's comment is a negotiating position — the
 * lease-review page says so in as many words, and it does not block. An
 * attorney's finding is a defect report against text we are asserting is
 * lawful. It blocks, and clearing it is a deliberate act with a reason
 * attached.
 */

export type LibraryFinding = {
  id: string;
  clauseSlug: string;
  body: string;
  /** When somebody answered it. Null while outstanding. */
  answeredAt: Date | string | null;
  /** What they did about it. */
  answer: string | null;
};

/**
 * Findings nobody has answered.
 *
 * BOTH HALVES ARE REQUIRED. A timestamp with no text, or text that is only
 * whitespace, is not an answer — and if either alone cleared a finding, the
 * mechanism would be as fast to bypass as to satisfy, which is the same as not
 * having it.
 */
export const outstandingFindings = <T extends LibraryFinding>(findings: T[]): T[] =>
  findings.filter((finding) => finding.answeredAt === null || (finding.answer ?? '').trim() === '');

/** Words for the outstanding ones, one per finding. */
export const findingBlockers = (findings: LibraryFinding[]): string[] =>
  /*
    Named per clause and quoted, rather than counted. "3 findings outstanding"
    makes somebody go looking; the slug puts them where the work is, and enough
    of the text makes it recognisable without opening anything.

    Two findings on one clause stay two lines. Collapsing by clause would let
    answering the first clear the second.
  */
  outstandingFindings(findings).map((finding) => {
    const body = finding.body.trim();
    const excerpt = body.length > 120 ? `${body.slice(0, 117)}…` : body;

    return `${finding.clauseSlug}: ${excerpt}`;
  });

/**
 * Why this clause may not be approved yet, or null if it may.
 *
 * A SENTENCE, NOT A BOOLEAN — the same shape as `admissionBlocks`, for the same
 * reason: the caller shows it to whoever is recording the approval, and
 * "blocked" without a reason is the kind of guard people route around. This one
 * additionally has to say where the work is, because unlike an admission
 * mismatch it IS fixable, by somebody, today.
 *
 * PASS ONLY THE FINDINGS FOR THE CLAUSE BEING APPROVED. The caller queries by
 * slug; this does not filter, because a filter here and a filter there is two
 * places to get the scope wrong.
 */
export const findingsBlock = (findings: LibraryFinding[]): string | null => {
  const blockers = findingBlockers(findings);

  if (blockers.length === 0) {
    return null;
  }

  const noun = blockers.length === 1 ? 'a finding' : `${blockers.length} findings`;

  return `Counsel recorded ${noun} against this clause that nobody has answered — ${blockers.join('; ')}. Answer it on the clause library before recording an approval.`;
};
