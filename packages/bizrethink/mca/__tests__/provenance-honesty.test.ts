import { describe, expect, it } from 'vitest';
import { checkAgainstSource } from '../prescribed/conformity';
import { normalisedDigest, readSourceText, sectionOf } from '../provenance/source-text';
import { unverifiableSentences, verifyProvenance } from '../provenance/verify';
import { CONTENT_STATUTES, MCA_DISCLOSURES, PRESCRIBED_FORMS } from '../registry';

/*
  INVARIANT 3 — provenance is honest.

  A date proves nothing on its own. Anyone can type one, and a typed date is
  indistinguishable from a real check right up to the moment it matters. So
  every `verbatimVerifiedAt` and `structureVerifiedAt` in this package is bound
  to something a machine re-executes on every run:

    1. the DIGEST of the vendored file the spec names, so that a regulator's
       amendment — the main way this rots — breaks the build instead of
       silently invalidating a form that still matches the old text;
    2. the SECTION of that file the form was actually transcribed from, so a
       label or sentence belonging to a neighbouring prescribed table cannot
       satisfy the check;
    3. for forms whose source prints its rows in table order, the ORDER of
       those labels.

  What this cannot do is prove a human read the regulation. It proves the bytes
  have not moved since they said they did, and that everything the spec claims
  is in those bytes and in the right part of them. The negative controls at the
  bottom exist because a check nobody has watched fail is not yet a check.
*/

describe('the declared digests are the digests of the vendored files', () => {
  it.each(
    MCA_DISCLOSURES.map((d) => [d.slug, d] as const),
  )('%s: the file it names still hashes to what it recorded', (_slug, spec) => {
    expect(normalisedDigest(readSourceText(spec.sourceFile))).toBe(spec.sourceDigest);
  });
});

describe('every spec re-verifies against its own source, now', () => {
  it.each(MCA_DISCLOSURES.map((d) => [d.slug, d] as const))('%s', (_slug, spec) => {
    expect(verifyProvenance(spec)).toEqual([]);
  });
});

/*
  The scoping is the load-bearing part, so state what it bought. California's
  regulation runs to 132k characters and prescribes at least six different
  tables — closed-end, open-end, factoring, sales-based, lease, asset-based.
  Only one of them is ours.
*/
describe('a form is checked against its own section, not the whole regulation', () => {
  it.each(
    PRESCRIBED_FORMS.filter((f) => f.section !== null).map((f) => [f.slug, f] as const),
  )('%s resolves its section, and it is a small part of the file', (_slug, form) => {
    const whole = readSourceText(form.sourceFile);
    const section = sectionOf(whole, form.section);

    expect(section).not.toBeNull();
    expect((section ?? '').length).toBeGreaterThan(500);
    expect((section ?? '').length).toBeLessThan(whole.length / 2);
  });
});

/*
  What no check can stand behind, stated as a number.

  These are sentences the regulation REQUIRES but does not word — "a short
  explanation that …" — so they are our drafting inside a row that is otherwise
  verified, and nothing can match them against the source. That is lawful and
  sometimes compelled. It is pinned rather than forbidden, because the failure
  mode of a green suite is being read as a clean form.
*/
describe('the unverifiable surface is declared, not hidden', () => {
  it('is exactly one sentence, in New York', () => {
    const unverifiable = PRESCRIBED_FORMS.flatMap((f) =>
      unverifiableSentences(f).map((s) => `${f.slug} row ${s.row} ← ${s.citation}`),
    );

    expect(unverifiable).toEqual(['ny-offer-summary row 0 ← 23 NYCRR §600.6(b)(3)(iii)']);
  });

  /*
    California §914(a)(2)(C)(iii) imposes the same obligation in the same words
    and our California form carries no such explanation. Both clauses are
    conditional, so this is either New York saying more than it must or
    California saying less — a question about the product, not the
    regulations. Pinned so the asymmetry cannot be smoothed over by a sweep
    before a human has answered it.
  */
  it('California carries no counterpart, which is a question for a human', () => {
    const ca = PRESCRIBED_FORMS.find((f) => f.slug === 'ca-offer-summary');

    expect(ca && unverifiableSentences(ca)).toEqual([]);
  });
});

describe('NEGATIVE CONTROLS — each of these must be caught', () => {
  const form = (slug: string) => {
    const found = PRESCRIBED_FORMS.find((f) => f.slug === slug);

    if (!found) {
      throw new Error(`${slug} is missing from the registry`);
    }

    return found;
  };

  const statute = (slug: string) => {
    const found = CONTENT_STATUTES.find((s) => s.slug === slug);

    if (!found) {
      throw new Error(`${slug} is missing from the registry`);
    }

    return found;
  };

  it('a source file edited after verification breaks the digest', () => {
    const tampered = { ...form('ca-offer-summary'), sourceDigest: 'f'.repeat(64) };
    const problems = verifyProvenance(tampered);

    expect(problems.map((p) => p.kind)).toContain('digest');
  });

  /*
    THE DEFECT THAT SHIPPED, PINNED.

    New York's own file contains California's phrasing of this sentence — it
    appears in a later section governing a different transaction type. So a
    check run against the whole file ACCEPTS California's words inside New
    York's form, which is how the defect survived. Scoped to §600.6 it does not.
  */
  it("New York's form cannot carry California's sentence, though that sentence is in New York's file", () => {
    const ny = form('ny-offer-summary');
    const CA_PHRASING =
      'Due to deductions or payments to others, the total funds that will be provided to you directly is [recipient funds]. For more information on what amounts will be deducted, please review the attached document "Itemization of Amount Financed."';

    const firstRow = ny.rows[0];

    if (!firstRow) {
      throw new Error('New York’s form should have a first row');
    }

    const swapped = {
      ...ny,
      rows: [{ ...firstRow, alsoPermitted: [CA_PHRASING] }, ...ny.rows.slice(1)],
    };

    // The whole file accepts it — this is the hole.
    expect(checkAgainstSource(swapped, readSourceText(ny.sourceFile))).toEqual([]);

    // Its own section does not.
    expect(verifyProvenance(swapped).map((p) => p.kind)).toContain('verbatim');
  });

  it('a label borrowed from a neighbouring prescribed table is refused', () => {
    const ca = form('ca-offer-summary');
    const foreign = { label: 'Repurchase Costs', verbatim: null, onlyPrescribedContent: true };
    const swapped = { ...ca, rows: [foreign, ...ca.rows.slice(1)] };

    // "Repurchase Costs" is a real California label — for FACTORING, not for us.
    expect(checkAgainstSource(swapped, readSourceText(ca.sourceFile))).toEqual([]);
    expect(verifyProvenance(swapped).map((p) => p.kind)).toContain('verbatim');
  });

  /*
    Connecticut's and Virginia's sources are the forms themselves, printed in
    table order, so their row ORDER is machine-checkable in a way California's
    and New York's is not. See `structureEvidence` for why the two differ.
  */
  it.each(
    PRESCRIBED_FORMS.filter((f) => f.structureEvidence === 'source-order').map((f) => [f.slug, f] as const),
  )('%s notices when its rows are reordered', (_slug, f) => {
    const shuffled = { ...f, rows: [...f.rows].reverse() };

    expect(verifyProvenance(shuffled).map((p) => p.kind)).toContain('structure');
  });

  /*
    "A Kansas form with Florida's headings is defective while saying all the
    right things." Kansas dictates every label; Florida dictates none.
  */
  it('a Kansas row relabelled with Florida’s heading is refused', () => {
    const ks = statute('ks-disclosure');
    const rest = ks.requirements.slice(1);
    const first = ks.requirements[0];

    if (!first) {
      throw new Error('Kansas should have requirements');
    }

    const swapped = { ...ks, requirements: [{ ...first, row: 'Total Funds Provided' }, ...rest] };

    expect(verifyProvenance(swapped).map((p) => p.kind)).toContain('label');
  });

  it('a spec pointing at a file that is not there says so', () => {
    const missing = { ...form('va-disclosure'), sourceFile: 'VA-Disclosure-Form.does-not-exist.txt' };

    expect(verifyProvenance(missing).map((p) => p.kind)).toContain('source');
  });

  it('a section whose anchors no longer resolve says so', () => {
    const ca = form('ca-offer-summary');
    const moved = { ...ca, section: { from: '§ 914. A Heading That Is Not There', to: '§ 915.' } };

    expect(verifyProvenance(moved).map((p) => p.kind)).toContain('section');
  });
});
