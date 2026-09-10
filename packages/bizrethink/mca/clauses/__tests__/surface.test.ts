import { describe, expect, it } from 'vitest';

import { INSTRUMENTS, MCA_INSTRUMENTS } from '../instruments';
import { ALL_MCA_CLAUSES } from '../library';
import { mcaLibrarySurface } from '../surface/view';

/**
 * The view model behind `/admin/mca-library`.
 *
 * WHY THERE IS A VIEW MODEL AT ALL, RATHER THAN THE ROUTE READING THE LIBRARY.
 * Two reasons, and the second is the one that bit `/admin/mca` first.
 *
 * The library reaches `node:fs` — `examination.ts` reads the vendored review
 * register — so a route importing it directly breaks the CLIENT build, not the
 * server one. `/admin/mca` learned that the expensive way: the first attempt
 * relied on tree-shaking to keep `node:path` out of the browser bundle, and
 * relying on an optimisation for correctness does not work. The `.server.ts`
 * shim is the mechanism that guarantees it.
 *
 * And a page is a claim. Every number rendered here is asserted below, because
 * the failure mode of an admin page is looking authoritative — which is exactly
 * what `/admin/mca` says about itself at the top of its own file.
 */
describe('the MCA clause library surface', () => {
  const surface = mcaLibrarySurface();

  it('shows every clause in the library, and no others', () => {
    expect(surface.clauses).toHaveLength(ALL_MCA_CLAUSES.length);
    // 204 until the four `[Reserved]` records were removed — section numbers the
    // document holds open after a clause was taken out, now declared non-clause.
    expect(surface.clauses).toHaveLength(200);
  });

  it('groups by instrument, in the declared order', () => {
    expect(surface.instruments.map((entry) => entry.id)).toEqual([...MCA_INSTRUMENTS]);

    for (const entry of surface.instruments) {
      expect(entry.title).toBe(INSTRUMENTS[entry.id].title);
      expect(entry.clauseCount).toBe(ALL_MCA_CLAUSES.filter((c) => c.instrument === entry.id).length);
    }

    expect(surface.instruments.reduce((n, e) => n + e.clauseCount, 0)).toBe(200);
  });

  /**
   * THE SENTENCE THE PAGE EXISTS TO MAKE TRUE.
   *
   * Not one of these 200 clauses may reach a merchant, and the reason is the
   * same for every one: `attorney-drafted` with no named author. The page states
   * it as a count with the reason attached, rather than leaving a reader to
   * infer it from 200 identical badges.
   */
  it('reports that nothing is publishable, and why', () => {
    expect(surface.totals.publishable).toBe(0);
    expect(surface.totals.clauses).toBe(200);

    for (const clause of surface.clauses) {
      expect(clause.publishProblems).toEqual([
        `${clause.slug}: attorney-drafted text published without a named reviewer`,
      ]);
    }
  });

  /**
   * Outstanding is the count AFTER dispositions, not the count of findings.
   * Reporting every finding ever raised would overstate by more than half, which
   * is what the library did before #129.
   */
  it('counts outstanding findings, not all findings', () => {
    // 136 until §9.3 was removed; it carried the one REVIEW-02 finding about an
    // unbounded cross-collateral grant, and that clause no longer exists.
    expect(surface.totals.findingsCited).toBe(135);
    expect(surface.totals.outstanding).toBe(38);
    expect(surface.totals.outstanding).toBeLessThan(surface.totals.findingsCited);
  });

  it('gives every clause its examination, resolved through the register', () => {
    for (const clause of surface.clauses) {
      expect(clause.examinedBy.length).toBeGreaterThan(0);

      for (const finding of clause.findings) {
        expect(finding.id.length).toBeGreaterThan(0);
        expect(['REVIEW-01', 'REVIEW-02']).toContain(finding.review);
      }
    }
  });

  /**
   * DEGRADES HONESTLY WHEN THE EVIDENCE IS NOT IN THE IMAGE.
   *
   * `provenance/source-text.ts` records that `mca/sources/` was not copied into
   * the production image, so `/admin/mca` rendered every state as unverified
   * until the Dockerfile was fixed. The clause library has the same exposure in
   * two places — the review register and the vendored agreements — and the
   * surface reports whether each is readable rather than rendering an empty
   * finding list that looks like good news.
   */
  it('says whether its evidence is present, rather than implying it', () => {
    expect(typeof surface.evidence.registerAvailable).toBe('boolean');
    expect(surface.evidence.registerAvailable).toBe(true);

    for (const entry of surface.instruments) {
      expect(['verified', 'digest-moved', 'source-missing']).toContain(entry.sourceState);
    }
  });

  /**
   * Every instrument's vendored document still matches the digest its clause
   * bodies were transcribed against. A `digest-moved` here is not a bug in this
   * package — it is the mechanism working, and it means somebody edited the
   * `.docx` in `lombard-contracts` and the library has not been re-vendored.
   */
  it('finds every instrument’s source unchanged', () => {
    for (const entry of surface.instruments) {
      expect(entry.sourceState, `${entry.id} source has moved`).toBe('verified');
    }
  });
});
