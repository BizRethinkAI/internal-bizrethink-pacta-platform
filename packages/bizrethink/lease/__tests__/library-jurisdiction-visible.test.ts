import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { coversJurisdiction, JURISDICTION_TIERS, jurisdictionLabel } from '../clauses/approval-jurisdiction';
import { ALL_CLAUSES, inReviewOrder, libraryFor } from '../clauses/library';
import { FL_SECTION_ORDER } from '../clauses/us-fl';

/**
 * The library has been split by jurisdiction since 2026-09-06, and NEITHER PAGE
 * SAID SO.
 *
 * `libraryFor()` selects `generic` ∪ `US` ∪ one state, so 36 of the 64 clauses
 * travel to any state and 28 turn on Florida. But `clauseLibrary.list` and
 * `clauseLibrary.openLibrary` both dropped `clause.jurisdiction` on the way
 * out, so a staff reviewer and an attorney each saw one flat list of 64 under a
 * heading that said "Every clause a Florida lease can be assembled from".
 *
 * That is this repo's characteristic failure — the split was real, tested, and
 * invisible. An attorney asked to approve "the Florida library" would have been
 * approving 36 clauses that are not Florida's, under an admission check that
 * silently waves them through.
 *
 * These tests hold three things:
 *
 *   A. the jurisdiction reaches both pages, with a LABEL and never a token;
 *   B. whether a portable-tier approval travels lives in exactly one function;
 *   C. a review link is scoped to one jurisdiction, hash included.
 */

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const router = read('../../server-only/trpc/lease-builder-router.ts');
const staffPage = read('../../../../apps/remix/app/routes/_authenticated+/admin+/lease-library.tsx');
const counselPage = read('../../../../apps/remix/app/routes/_recipient+/clause-review.$token.tsx');
const additions = read('../../prisma-extensions/additions.prisma');

/*
  Scoped to the clauseLibrary sub-router. `list` is also the name of half a
  dozen procedures on this router, and the first one in the file is
  `properties.list` — a test that read that would pass or fail for reasons
  having nothing to do with the clause library.
*/
const clauseLibraryRouter = router.slice(router.indexOf('clauseLibrary: router({'));

/** One procedure's source, to the next procedure definition. */
const proc = (source: string, name: string) => {
  const start = source.indexOf(`${name}: `);

  if (start === -1) {
    return '';
  }

  const rest = source.slice(start + name.length);
  const next = rest.search(/\n {4}\w+: (?:authenticatedProcedure|procedure)/);

  return name + (next === -1 ? rest : rest.slice(0, next));
};

// ── A. The jurisdiction is visible, and it is a label ──────────────────────

describe('jurisdictionLabel', () => {
  /*
    The three labels are the product's own words for the tiers, and two of them
    are chosen against the obvious. "Generic" and "Portable" describe the
    LIBRARY'S filing system; a reviewer needs to know what the clause depends
    on, and the answer is that it depends on no state's law.
  */
  it('names each tier in words a reviewer can act on', () => {
    expect(jurisdictionLabel('US-FL')).toBe('Florida law');
    expect(jurisdictionLabel('US')).toBe('Federal law');
    expect(jurisdictionLabel('generic')).toBe("No state's law");
    expect(jurisdictionLabel('US-NC')).toBe('North Carolina law');
  });

  it('never renders the raw token, and never says Generic or Portable', () => {
    for (const jurisdiction of new Set(ALL_CLAUSES.map((clause) => clause.jurisdiction))) {
      const label = jurisdictionLabel(jurisdiction);

      expect(label, jurisdiction).not.toBe(jurisdiction);
      expect(label, jurisdiction).not.toMatch(/generic|portable/i);
    }
  });

  /*
    One map, not two. A second map of the same four values is a map that drifts,
    and the sentence `admissionBlocks` returns is built from the same names.
  */
  it('is the same source the admission sentence reads from', () => {
    const source = read('../clauses/approval-jurisdiction.ts');
    const maps = source.match(/Record<ClauseJurisdiction, string>/g) ?? [];

    expect(maps.length).toBe(1);
  });
});

describe('every tier is shown, in a fixed order', () => {
  it('covers every jurisdiction the library actually holds', () => {
    for (const jurisdiction of new Set(ALL_CLAUSES.map((clause) => clause.jurisdiction))) {
      expect(JURISDICTION_TIERS, jurisdiction).toContain(jurisdiction);
    }
  });

  it('leads with the state tier, because that is where an admission matters', () => {
    expect(JURISDICTION_TIERS[0]).toBe('US-FL');
    expect(JURISDICTION_TIERS[JURISDICTION_TIERS.length - 1]).toBe('generic');
  });
});

describe('inReviewOrder', () => {
  /*
    Both pages rendered in module-concatenation order — the order the clause
    files happen to be imported in — which is neither document order nor any
    other order a reader could name.
  */
  it('groups by tier, in tier order', () => {
    const tiers = inReviewOrder(ALL_CLAUSES).map((clause) =>
      JURISDICTION_TIERS.indexOf(clause.jurisdiction as (typeof JURISDICTION_TIERS)[number]),
    );

    expect(tiers).toEqual([...tiers].sort((a, b) => a - b));
  });

  it('orders within a tier by the section order selectClauses uses', () => {
    for (const tier of JURISDICTION_TIERS) {
      const ranks = inReviewOrder(ALL_CLAUSES)
        .filter((clause) => clause.jurisdiction === tier)
        .map((clause) => FL_SECTION_ORDER.indexOf(clause.section as (typeof FL_SECTION_ORDER)[number]));

      expect(ranks, tier).toEqual([...ranks].sort((a, b) => a - b));
    }
  });

  it('keeps every clause, and none twice', () => {
    const ordered = inReviewOrder(ALL_CLAUSES);

    expect(ordered.length).toBe(ALL_CLAUSES.length);
    expect(new Set(ordered.map((clause) => clause.slug)).size).toBe(ALL_CLAUSES.length);
  });
});

describe('the jurisdiction reaches both pages', () => {
  it('is returned by the staff list, which dropped it', () => {
    expect(proc(clauseLibraryRouter, 'list')).toMatch(/jurisdiction: clause\.jurisdiction/);
  });

  it('is returned by the counsel link, which dropped it too', () => {
    expect(proc(clauseLibraryRouter, 'openLibrary')).toMatch(/jurisdiction: clause\.jurisdiction/);
  });

  it('is labelled on both pages rather than printed as a token', () => {
    expect(staffPage).toMatch(/jurisdictionLabel/);
    expect(counselPage).toMatch(/jurisdictionLabel/);
  });

  it('groups both pages by tier', () => {
    expect(staffPage).toMatch(/JURISDICTION_TIERS/);
    expect(counselPage).toMatch(/JURISDICTION_TIERS/);
  });

  /*
    The heading said "Every clause a Florida lease can be assembled from",
    which reads as a claim that all 64 are Florida law. Thirty-six are not.
  */
  it('no longer heads the staff page with a claim that is false for 36 of 64', () => {
    expect(staffPage).not.toMatch(/Every clause a Florida lease can be assembled from/);
  });
});

// ── B. Whether a portable approval travels, in one place ───────────────────

describe('coversJurisdiction', () => {
  const approval = (clauseJurisdiction: string, barJurisdiction: string | null) => ({
    clauseJurisdiction,
    barJurisdiction,
  });

  it('lets a Florida approval of a Florida clause count for Florida', () => {
    expect(coversJurisdiction(approval('US-FL', 'US-FL'), 'US-FL')).toBe(true);
  });

  /*
    A state clause approved for one state says nothing about another. This half
    is not the open question — it follows from the clause depending on that
    state's law.
  */
  it('does not let a Florida clause approval count for North Carolina', () => {
    expect(coversJurisdiction(approval('US-FL', 'US-FL'), 'US-NC')).toBe(false);
  });

  /*
    THE OPEN QUESTION, held permissively and in one function. A clause that
    turns on no state's law was approved by an attorney admitted in Florida:
    does that approval travel to a North Carolina lease? Counsel has been asked.
    Today the answer is yes, and changing it is one constant.
  */
  it('lets a portable-tier approval travel, which is the reading counsel was asked to confirm', () => {
    expect(coversJurisdiction(approval('generic', 'US-FL'), 'US-NC')).toBe(true);
    expect(coversJurisdiction(approval('US', 'US-FL'), 'US-NC')).toBe(true);
  });

  it('refuses an approval that never recorded which bar', () => {
    expect(coversJurisdiction(approval('generic', null), 'US-FL')).toBe(false);
  });

  it('lives beside admissionBlocks, so the two readings cannot drift apart', () => {
    expect(read('../clauses/approval-jurisdiction.ts')).toMatch(/export const coversJurisdiction/);
  });
});

describe('both approval displays compute through it', () => {
  it('makes the staff counter ask the helper', () => {
    expect(proc(clauseLibraryRouter, 'list')).toMatch(/coversJurisdiction\(/);
  });

  it('makes the counsel Approved badge ask the helper', () => {
    expect(proc(clauseLibraryRouter, 'openLibrary')).toMatch(/coversJurisdiction\(/);
  });
});

// ── C. A review link covers one jurisdiction ───────────────────────────────

describe('a counsel link is scoped to one jurisdiction', () => {
  it('records which jurisdiction the link covers', () => {
    expect(additions).toMatch(/model BizrethinkLibraryReview[\s\S]*?\n}/);
    expect(additions.slice(additions.indexOf('model BizrethinkLibraryReview'))).toMatch(/\n\s*jurisdiction\s+String/);
  });

  it('has a migration that adds the column, NOT NULL because the table is empty', () => {
    const sql = read('../../../prisma/migrations/20260906230000_library_review_jurisdiction/migration.sql');

    expect(sql).toMatch(/ALTER TABLE "BizrethinkLibraryReview" ADD COLUMN "jurisdiction" TEXT NOT NULL/);
    expect(sql).not.toMatch(/DEFAULT/);
  });

  it('takes the jurisdiction when the link is minted', () => {
    expect(proc(clauseLibraryRouter, 'share')).toMatch(/jurisdiction/);
  });

  /*
    THE HASH HAS TO BE SCOPED TOO. `libraryFingerprint(FL_LIBRARY)` pins all 64
    clauses; a North Carolina link pinned to Florida text would report "the
    library has changed" the moment a Florida clause moved, on a page that never
    showed one.
  */
  it('pins the fingerprint of the scoped library, not the whole of it', () => {
    expect(proc(clauseLibraryRouter, 'share')).toMatch(/libraryFingerprint\(libraryFor\(/);
    expect(proc(clauseLibraryRouter, 'openLibrary')).toMatch(/libraryFingerprint\(/);
    expect(proc(clauseLibraryRouter, 'openLibrary')).toMatch(/libraryFor\(/);
  });

  it('serves the scoped library, so no other state can reach the reviewer', () => {
    expect(proc(clauseLibraryRouter, 'openLibrary')).not.toMatch(/FL_LIBRARY\.map/);
  });

  /*
    A finding must name a clause the reviewer was actually shown. Validating
    against the whole library would accept one against a clause that is not on
    their link at all.
  */
  it('validates a finding against the clauses on that link', () => {
    expect(proc(clauseLibraryRouter, 'recordFinding')).toMatch(/libraryFor\(/);
  });

  /*
    One option today, which is honest — Florida is the only state the library
    holds clauses for. It is a control rather than a hard-coded argument so
    that adding the second is one line, in the place someone would look.
  */
  it('offers the jurisdiction on the staff share form', () => {
    expect(staffPage).toMatch(/share\.mutate\(\{[\s\S]*?jurisdiction/);
    expect(staffPage).toMatch(/setJurisdiction/);
  });
});

// ── D. One user-facing string was a legal assertion ────────────────────────

describe('the Admitted in helper states the mechanism, not the answer', () => {
  /*
    It said clauses depending on no state's law "may be approved by any US
    admission". That is exactly the question counsel has not answered, asserted
    as settled, in a user-facing string — which `engineering-standard.md` bans.
  */
  it('no longer says a portable clause may be approved by any US admission', () => {
    expect(staffPage).not.toMatch(/may be approved by any US admission/);
  });

  it('says instead what the software does with the value', () => {
    expect(staffPage).toMatch(/checked against/i);
  });
});

// ── The scoping is real, not just wired ────────────────────────────────────

describe('what a Florida link actually covers', () => {
  it('is 36 portable clauses and 28 Florida ones, across two labels', () => {
    const florida = libraryFor('US-FL');

    expect(florida.length).toBe(64);
    expect(florida.filter((clause) => clause.jurisdiction === 'US-FL').length).toBe(28);
    expect(florida.filter((clause) => clause.jurisdiction !== 'US-FL').length).toBe(36);
  });
});
