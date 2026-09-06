import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GA_DISCLOSURE } from '../content/statutes/ga';
import { KS_DISCLOSURE } from '../content/statutes/ks';
import { LA_DISCLOSURE } from '../content/statutes/la';
import { MO_DISCLOSURE } from '../content/statutes/mo';
import { TX_DISCLOSURE } from '../content/statutes/tx';
import { UT_DISCLOSURE } from '../content/statutes/ut';
import { checkContentCoverage } from '../content/types';
import ga from './ga-rows.fixture.json';
import ks from './ks-rows.fixture.json';
import la from './la-rows.fixture.json';
import mo from './mo-rows.fixture.json';
import tx from './tx-rows.fixture.json';
import ut from './ut-rows.fixture.json';

const CASES = [
  { statute: KS_DISCLOSURE, rendered: ks },
  { statute: MO_DISCLOSURE, rendered: mo },
  { statute: UT_DISCLOSURE, rendered: ut },
  { statute: LA_DISCLOSURE, rendered: la },
  { statute: GA_DISCLOSURE, rendered: ga },
  { statute: TX_DISCLOSURE, rendered: tx },
];

describe.each(CASES)('$statute.citation', ({ statute, rendered }) => {
  it('carries every required item', () => {
    const gaps = checkContentCoverage(statute, rendered);

    // eslint-disable-next-line no-console
    if (gaps.length) {
      console.log(`\n${gaps.map((g) => `  - ${g.detail}`).join('\n')}`);
    }

    expect(gaps).toEqual([]);
  });

  it('leaves nothing unplaced', () => {
    expect(statute.requirements.filter((r) => r.row === null)).toEqual([]);
  });

  it('cites a statute we actually hold', () => {
    const src = readFileSync(join(__dirname, '../sources', statute.sourceFile), 'utf8');
    expect(src.length).toBeGreaterThan(1000);
  });
});

/*
  Kansas and Missouri prescribe their labels; Florida, Louisiana, Utah and
  Georgia do not. Asserted rather than left as a comment, because the six acts
  read so alike that "they are all the same model act" is the obvious and wrong
  conclusion — and acting on it would put Florida's headings on a Kansas form,
  which is defective while saying all the right things.
*/
describe('which states dictate their labels', () => {
  const prescribes = (s: { requirements: { labelPrescribed?: boolean }[] }) =>
    s.requirements.every((r) => r.labelPrescribed === true);

  it('Kansas and Missouri do', () => {
    expect(prescribes(KS_DISCLOSURE)).toBe(true);
    expect(prescribes(MO_DISCLOSURE)).toBe(true);
  });

  it('Utah, Louisiana and Georgia do not', () => {
    for (const s of [UT_DISCLOSURE, LA_DISCLOSURE, GA_DISCLOSURE]) {
      expect(s.requirements.some((r) => r.labelPrescribed === true)).toBe(false);
    }
  });
});
