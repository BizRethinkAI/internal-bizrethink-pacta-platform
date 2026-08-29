import type { Clause, ClauseFacts } from '../clauses/types';
import { FL_SECTION_ORDER } from '../clauses/us-fl';

/**
 * Turn a set of facts into an ordered, numbered document.
 *
 * This is the step a template with slots does not have. A template's numbering
 * is written into the template, so an unanticipated term has nowhere to go but
 * a free-text box at the back — which is how the 2026 lease ended up with its
 * most negotiated provisions unnumbered, uncross-referenceable, and invisible
 * to the rest of the document.
 *
 * Here, numbering is *derived from what survives selection*, so a clause added
 * mid-document renumbers everything after it automatically, and a clause that
 * drops out leaves no gap.
 */

export type SelectedClause = Clause & {
  /** Derived at selection, e.g. '4.2'. Never stored on the clause. */
  number: string;
};

export type SupersessionRecord = {
  slug: string;
  by: string;
};

export type DuplicateAssertion = {
  assertion: string;
  slugs: string[];
};

export type SelectClausesOptions = {
  facts: ClauseFacts;
  library: Clause[];
  sectionOrder?: readonly string[];
};

export type SelectClausesResult = {
  /** Lease body clauses only, in document order, numbered. */
  selected: SelectedClause[];
  /**
   * Attached addenda. Each is a document in its own right with its own
   * signature block, so it is not numbered as a section of the lease body.
   */
  addenda: Clause[];
  /**
   * Clauses that must be issued as their own documents rather than folded into
   * the lease — currently the Fla. Stat. §83.512 flood disclosure, which the
   * statute says may not be buried in the lease body.
   */
  standaloneDisclosures: Clause[];
  superseded: SupersessionRecord[];
  duplicateAssertions: DuplicateAssertion[];
};

const includes = (clause: Clause, facts: ClauseFacts): boolean =>
  clause.includeWhen === null || clause.includeWhen(facts);

/**
 * Resolve clauses that replace one another. A clause is dropped when another
 * *surviving* clause names it in `supersedes`.
 */
const applySupersession = (candidates: Clause[]): { kept: Clause[]; superseded: SupersessionRecord[] } => {
  const present = new Set(candidates.map((c) => c.slug));
  const supersededBy = new Map<string, string>();

  for (const clause of candidates) {
    for (const target of clause.supersedes) {
      if (present.has(target)) {
        supersededBy.set(target, clause.slug);
      }
    }
  }

  return {
    kept: candidates.filter((c) => !supersededBy.has(c.slug)),
    superseded: [...supersededBy.entries()].map(([slug, by]) => ({ slug, by })),
  };
};

/**
 * Two clauses claiming the same ground. Not an error — a custom clause may
 * legitimately restate something for emphasis — but the drafter should be told,
 * because silent duplication is how a lease ends up saying the same thing twice
 * in two slightly different ways.
 */
const findDuplicateAssertions = (clauses: Clause[]): DuplicateAssertion[] => {
  const byAssertion = new Map<string, string[]>();

  for (const clause of clauses) {
    for (const assertion of clause.asserts) {
      byAssertion.set(assertion, [...(byAssertion.get(assertion) ?? []), clause.slug]);
    }
  }

  return [...byAssertion.entries()]
    .filter(([, slugs]) => slugs.length > 1)
    .map(([assertion, slugs]) => ({ assertion, slugs }));
};

/** Number as `n` for the first clause in a section, `n.m` where a section has several. */
const numberClauses = (ordered: Clause[]): SelectedClause[] => {
  const countBySection = new Map<string, number>();

  for (const clause of ordered) {
    countBySection.set(clause.section, (countBySection.get(clause.section) ?? 0) + 1);
  }

  const sectionNumbers = new Map<string, number>();
  const positionInSection = new Map<string, number>();
  let nextSection = 0;

  return ordered.map((clause) => {
    if (!sectionNumbers.has(clause.section)) {
      nextSection += 1;
      sectionNumbers.set(clause.section, nextSection);
    }

    const section = sectionNumbers.get(clause.section)!;
    const position = (positionInSection.get(clause.section) ?? 0) + 1;

    positionInSection.set(clause.section, position);

    const isOnlyClauseInSection = countBySection.get(clause.section) === 1;

    return { ...clause, number: isOnlyClauseInSection ? String(section) : `${section}.${position}` };
  });
};

export const selectClauses = ({
  facts,
  library,
  sectionOrder = FL_SECTION_ORDER,
}: SelectClausesOptions): SelectClausesResult => {
  const applicable = library.filter((clause) => includes(clause, facts));

  const { kept, superseded } = applySupersession(applicable);

  const standaloneDisclosures = kept.filter((c) => c.placement === 'standalone-disclosure');
  const addenda = kept.filter((c) => c.placement === 'addendum');
  const inDocument = kept.filter((c) => c.placement === 'lease-body');

  const rank = (clause: Clause): number => {
    const index = sectionOrder.indexOf(clause.section);

    if (index === -1) {
      throw new Error(`clause ${clause.slug} names section "${clause.section}", which is not in the section order`);
    }

    return index;
  };

  const ordered = [...inDocument].sort((a, b) => rank(a) - rank(b) || a.sortKey - b.sortKey);

  return {
    selected: numberClauses(ordered),
    addenda,
    standaloneDisclosures,
    superseded,
    // Standalone disclosures are excluded: a disclosure restating something the
    // lease also says is required by statute, not a drafting slip. Addenda are
    // included, because an addendum contradicting the body is exactly the class
    // of duplication worth catching.
    duplicateAssertions: findDuplicateAssertions([...inDocument, ...addenda]),
  };
};
