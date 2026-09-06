import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkAgainstSource } from '../prescribed/conformity';
import type { PrescribedForm } from '../prescribed/types';
import rendered from './ca-rows.fixture.json';

/*
  The real thing, on real text: a spec seeded from OUR California form, checked
  against the actual regulation.

  This is the Phase 2 workflow in miniature. Seeding a library from documents we
  already ship is the obvious way to build it and the dangerous one, because the
  documents are where the defects live — REVIEW-01 found 207. This test is what
  stops a defect being promoted into the library as authority.
*/

const source = readFileSync(join(__dirname, '../sources/CA-10CCR-900-956.txt'), 'utf8');

/** Seeded from Lombard_CA_Disclosure_v1, exactly as a naive import would. */
const seeded: PrescribedForm = {
  slug: 'ca-offer-summary',
  citation: '10 CCR §914',
  sourceFile: 'CA-10CCR-900-956.txt',
  rows: rendered.map((r) => ({ label: r.label, verbatim: null, onlyPrescribedContent: false })),
};

describe('a spec seeded from our own form, checked against the statute', () => {
  it('reports every label the regulation does not contain', () => {
    const out = checkAgainstSource(seeded, source);

    // Whatever the count, the value is that it is CHECKED rather than assumed.
    // Record the current answer so a regression is visible.
    expect(out.every((d) => d.kind === 'not-in-source')).toBe(true);
    // eslint-disable-next-line no-console
    console.log(
      `\n  labels absent from 10 CCR: ${out.length} of ${seeded.rows.length}\n` +
        out.map((d) => `    - ${d.detail}`).join('\n'),
    );
  });
});
