import { describe, expect, it } from 'vitest';

import { assertPublishable } from '../../../provenance/types';
import {
  admissionBlocks,
  approvalBlocks,
  approvedMcaClause,
  findingsHold,
  isMcaApprovalCurrent,
  type McaClauseApproval,
  mcaClauseFingerprint,
  mcaLibraryFingerprint,
  normaliseMcaAdmission,
  statesNotCovered,
} from '../approval';
import type { ReviewFinding } from '../examination';
import { ALL_MCA_CLAUSES } from '../library';
import type { McaClause } from '../types';

/**
 * The approval mechanism, asserted before it exists.
 *
 * WHAT THESE TESTS ARE FOR, IN ONE SENTENCE: an approval must be capable of
 * LAPSING, and it must be capable of REFUSING. A mechanism that always says
 * yes is not a gate — this package has already shipped two assertions that
 * filtered on `Divergence` kinds that do not exist and passed vacuously for a
 * day, so every "it allows" below is paired with an "it refuses".
 */

const clause = (overrides: Partial<McaClause> = {}): McaClause => ({
  slug: 'frpa-test-clause',
  version: 1,
  instrument: 'frpa',
  number: '2.1',
  section: 'purchase',
  sortKey: 10,
  heading: 'Purchase and Sale',
  body: 'Seller sells and Purchaser buys the Purchased Amount of Future Receivables.',
  source: { kind: 'attorney-drafted', author: null },
  status: 'draft',
  appliesInStates: [],
  examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  ...overrides,
});

const approvalFor = (subject: McaClause, overrides: Partial<McaClauseApproval> = {}): McaClauseApproval => ({
  clauseSlug: subject.slug,
  clauseVersion: subject.version,
  instrument: subject.instrument,
  fingerprint: mcaClauseFingerprint(subject),
  approvedByName: 'Jane Roe',
  approvedByBarNumber: 'CA 123456',
  barJurisdiction: 'US-CA',
  recordedByUserId: 3,
  approvedAt: new Date('2026-09-08T00:00:00Z'),
  notes: null,
  ...overrides,
});

const finding = (overrides: Partial<ReviewFinding> = {}): ReviewFinding => ({
  id: 'frpa-some-defect',
  review: 'REVIEW-02',
  status: 'survived',
  finding: 'The clause promises a reconciliation it never defines.',
  disposition: 'open',
  ...overrides,
});

describe('the fingerprint an approval is pinned to', () => {
  it('moves when any word a merchant reads moves', () => {
    const base = clause();

    for (const changed of [
      clause({ body: `${base.body} Amended.` }),
      clause({ heading: 'Purchase and Sale of Receivables' }),
      clause({ number: '2.2' }),
      clause({ version: 2 }),
      clause({ requiredBy: '10 CCR §952' }),
    ]) {
      expect(mcaClauseFingerprint(changed)).not.toBe(mcaClauseFingerprint(base));
    }
  });

  it('moves when the clause moves to another agreement, or is scoped to another state', () => {
    const base = clause();

    expect(mcaClauseFingerprint(clause({ instrument: 'subscription' }))).not.toBe(mcaClauseFingerprint(base));
    expect(mcaClauseFingerprint(clause({ appliesInStates: ['US-CA'] }))).not.toBe(mcaClauseFingerprint(base));
    expect(mcaClauseFingerprint(clause({ section: 'reconciliation' }))).not.toBe(mcaClauseFingerprint(base));
  });

  it('does NOT move when the clause is only reordered', () => {
    expect(mcaClauseFingerprint(clause({ sortKey: 999 }))).toBe(mcaClauseFingerprint(clause()));
  });

  it('does NOT move when the approval itself fills in the author', () => {
    const base = clause();
    const approved = approvedMcaClause(base, approvalFor(base));

    expect(mcaClauseFingerprint(approved)).toBe(mcaClauseFingerprint(base));
  });

  it('does NOT move when the status changes', () => {
    expect(mcaClauseFingerprint(clause({ status: 'published' }))).toBe(mcaClauseFingerprint(clause()));
  });
});

describe('whether an approval still describes the clause', () => {
  it('holds while the words are the words that were approved', () => {
    const base = clause();

    expect(isMcaApprovalCurrent(base, approvalFor(base))).toBe(true);
  });

  it('lapses the moment a word changes', () => {
    const base = clause();
    const approval = approvalFor(base);

    expect(isMcaApprovalCurrent(clause({ body: 'Different words entirely.' }), approval)).toBe(false);
  });

  it('refuses an approval with no approval at all, no name, or another clause’s slug', () => {
    const base = clause();

    expect(isMcaApprovalCurrent(base, null)).toBe(false);
    expect(isMcaApprovalCurrent(base, approvalFor(base, { approvedByName: '   ' }))).toBe(false);
    expect(isMcaApprovalCurrent(base, approvalFor(base, { clauseSlug: 'iso-pra-2-6' }))).toBe(false);
  });

  it('refuses an approval recorded against the same slug in another agreement', () => {
    const base = clause();

    expect(isMcaApprovalCurrent(base, approvalFor(base, { instrument: 'subscription' }))).toBe(false);
  });
});

describe('the approval works only by supplying what assertPublishable already demands', () => {
  it('leaves the clause unpublishable with no approval', () => {
    const problems = assertPublishable({ ...clause(), status: 'published' });

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('attorney-drafted text published without a named reviewer');
  });

  it('makes the clause publishable by naming the author, and by nothing else', () => {
    const base = clause();
    const approved = approvedMcaClause(base, approvalFor(base));

    expect(approved.source).toEqual({ kind: 'attorney-drafted', author: 'Jane Roe (CA 123456)' });
    expect(approved.status).toBe('published');
    expect(assertPublishable(approved)).toEqual([]);
  });

  it('names the attorney alone when no bar number was recorded', () => {
    const base = clause();
    const approved = approvedMcaClause(base, approvalFor(base, { approvedByBarNumber: null }));

    expect(approved.source).toEqual({ kind: 'attorney-drafted', author: 'Jane Roe' });
  });

  /*
    THE APPROVAL SUPPLIES ONE FACT AND NO OTHERS. It fills in the author that
    `attorney-drafted` demands. It does not, and must not, satisfy any other
    provenance requirement — a verification date is earned by reading the
    statute, and an approval that could stand in for one would be the second,
    parallel gate this design exists to avoid.
  */
  it('cannot substitute for a verification date on text of a kind it does not author', () => {
    const statutory = clause({
      source: { kind: 'statute', citation: '10 CCR §952', verbatimRequired: true, verbatimVerifiedAt: null },
    });
    const approved = approvedMcaClause(statutory, approvalFor(statutory));

    expect(approved.status).toBe('published');
    expect(assertPublishable(approved)).toHaveLength(1);
    expect(assertPublishable(approved)[0]).toContain('without a verification date');
  });

  it('leaves a lapsed approval unpublishable, author and all', () => {
    const base = clause();
    const stale = approvalFor(clause({ body: 'The words that were read.' }));
    const approved = approvedMcaClause(base, stale);

    expect(approved.status).toBe('draft');
    expect(assertPublishable({ ...approved, status: 'published' })).toHaveLength(1);
  });

  it('never publishes a retired clause, whatever an approval says', () => {
    const retired = clause({ status: 'retired' });

    expect(approvedMcaClause(retired, approvalFor(retired)).status).toBe('retired');
  });
});

describe('the library fingerprint a review link is pinned to', () => {
  it('does not depend on the order the clauses arrive in', () => {
    const clauses = [clause({ slug: 'a' }), clause({ slug: 'b' })];

    expect(mcaLibraryFingerprint(clauses)).toBe(mcaLibraryFingerprint([...clauses].reverse()));
  });

  it('moves when any clause in it moves', () => {
    const before = [clause({ slug: 'a' }), clause({ slug: 'b' })];
    const after = [clause({ slug: 'a' }), clause({ slug: 'b', body: 'Rewritten.' })];

    expect(mcaLibraryFingerprint(after)).not.toBe(mcaLibraryFingerprint(before));
  });
});

describe('which bar an approval was recorded under', () => {
  it('reads what a human typed', () => {
    expect(normaliseMcaAdmission('CA')).toBe('US-CA');
    expect(normaliseMcaAdmission(' california ')).toBe('US-CA');
    expect(normaliseMcaAdmission('us-ny')).toBe('US-NY');
  });

  it('refuses a state the library holds no MCA law for, and refuses nothing at all', () => {
    expect(normaliseMcaAdmission('Ohio')).toBeNull();
    expect(normaliseMcaAdmission(null)).toBeNull();
  });

  it('refuses to record an approval that does not say which bar', () => {
    expect(admissionBlocks(clause(), null)).toContain('which bar');
  });

  it('accepts any admission on a clause no state’s law scopes', () => {
    expect(admissionBlocks(clause({ appliesInStates: [] }), 'US-FL')).toBeNull();
  });

  it('refuses an admission in none of the states the clause is in the document for', () => {
    const scoped = clause({ appliesInStates: ['US-CA', 'US-NY'] });
    const blocked = admissionBlocks(scoped, 'US-FL');

    expect(blocked).not.toBeNull();
    expect(blocked).toContain('California');
    expect(blocked).toContain('New York');
  });

  it('accepts an admission in one of them, and says which are still uncovered', () => {
    const scoped = clause({ appliesInStates: ['US-CA', 'US-NY'] });

    expect(admissionBlocks(scoped, 'US-CA')).toBeNull();
    expect(statesNotCovered(scoped, 'US-CA')).toEqual(['US-NY']);
    expect(statesNotCovered(clause(), 'US-CA')).toEqual([]);
  });
});

describe('an outstanding finding holds the clause', () => {
  it('refuses while a survived finding nobody has disposed of names it', () => {
    const held = findingsHold([finding()], true);

    expect(held).not.toBeNull();
    expect(held).toContain('frpa-some-defect');
  });

  it('names every one of them rather than counting', () => {
    const held = findingsHold([finding(), finding({ id: 'frpa-other-defect' })], true);

    expect(held).toContain('frpa-some-defect');
    expect(held).toContain('frpa-other-defect');
  });

  it('allows when nothing is outstanding', () => {
    expect(findingsHold([], true)).toBeNull();
  });

  it('says where the disposition is recorded, because it is not recorded here', () => {
    expect(findingsHold([finding()], true)).toContain('lombard-contracts');
  });

  /*
    FAIL CLOSED WHEN THE EVIDENCE IS NOT THERE. An unreadable register returns
    an empty findings list, which is indistinguishable from a clean clause. The
    register is copied into the container today, so this guard costs nothing now
    and is the whole guard the day somebody edits that COPY line.
  */
  it('refuses entirely when the register cannot be read, even with nothing outstanding', () => {
    const blocked = findingsHold([], false);

    expect(blocked).not.toBeNull();
    expect(blocked).toContain('register');
  });

  it('says that before naming findings, since an empty list is what it cannot be trusted about', () => {
    const blocked = findingsHold([finding()], false);

    expect(blocked).toContain('register');
    expect(blocked).not.toContain('frpa-some-defect');
  });
});

describe('approvalBlocks — the one door every caller goes through', () => {
  const evidenceAvailable = true;

  it('reports the admission before the finding, because reading a finding cannot fix an admission', () => {
    const scoped = clause({ appliesInStates: ['US-CA'] });

    expect(approvalBlocks(scoped, { admission: 'US-FL', outstanding: [finding()], evidenceAvailable })).toContain(
      'California',
    );
  });

  it('reports the finding once the admission is right', () => {
    expect(approvalBlocks(clause(), { admission: 'US-CA', outstanding: [finding()], evidenceAvailable })).toContain(
      'frpa-some-defect',
    );
  });

  it('lets a clean clause through', () => {
    expect(approvalBlocks(clause(), { admission: 'US-CA', outstanding: [], evidenceAvailable })).toBeNull();
  });

  /*
    FAIL CLOSED WHEN THE EVIDENCE IS NOT THERE.

    `outstandingFindingsFor` reads a register off disk, and when the file is
    absent it returns [] — so an unreadable register and a clean clause are
    INDISTINGUISHABLE to every caller. The register is copied into the
    container today (docker/Dockerfile), which means this guard costs nothing
    now and is the whole guard the day somebody edits that COPY line.

    A findings gate that silently stops gating is this repo's characteristic
    failure, not a hypothetical one: the E2E suite went dark twice without a
    red test.
  */
  it('refuses entirely when the review register cannot be read', () => {
    const blocked = approvalBlocks(clause(), { admission: 'US-CA', outstanding: [], evidenceAvailable: false });

    expect(blocked).not.toBeNull();
    expect(blocked).toContain('register');
  });

  it('says so before the findings, since an empty list is exactly what it cannot be trusted about', () => {
    const blocked = approvalBlocks(clause(), {
      admission: 'US-CA',
      outstanding: [finding()],
      evidenceAvailable: false,
    });

    expect(blocked).toContain('register');
    expect(blocked).not.toContain('frpa-some-defect');
  });
});

describe('against the real library, so this is not a test of its own fixtures', () => {
  it('fingerprints every clause distinctly', () => {
    const prints = new Set(ALL_MCA_CLAUSES.map((entry) => mcaClauseFingerprint(entry)));

    expect(prints.size).toBe(ALL_MCA_CLAUSES.length);
  });

  it('leaves every clause unpublishable until an approval names an author', () => {
    const publishable = ALL_MCA_CLAUSES.filter(
      (entry) => assertPublishable({ ...entry, status: 'published' }).length === 0,
    );

    expect(publishable).toEqual([]);
  });

  it('publishes one once, and only once, an approval is recorded against its exact words', () => {
    const [first] = ALL_MCA_CLAUSES;

    expect(assertPublishable(approvedMcaClause(first, approvalFor(first)))).toEqual([]);
  });
});
