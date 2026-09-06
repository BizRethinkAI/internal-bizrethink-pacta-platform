import { describe, expect, it } from 'vitest';
import { FL_DISCLOSURE } from '../content/statutes/fl';
import { checkContentCoverage } from '../content/types';
import rendered from './fl-rows.fixture.json';

/*
  Florida is the type specimen for the nine content-only states: it says what a
  disclosure must convey and leaves the words to us.

  The check is therefore the inverse of California's. There, the question is
  whether we said anything we were not allowed to say. Here it is whether every
  lettered item has a home — a failure that produces a form which reads
  perfectly and is missing a paragraph.
*/
describe('Lombard_FL_Disclosure_v1 against Fla. Stat. §559.9613(2)', () => {
  it('carries every lettered item', () => {
    const gaps = checkContentCoverage(FL_DISCLOSURE, rendered);

    // eslint-disable-next-line no-console
    if (gaps.length) {
      console.log(`\n${gaps.map((g) => `  - ${g.detail}`).join('\n')}`);
    }

    expect(gaps).toEqual([]);
  });

  it('places all six — none left unassigned', () => {
    expect(FL_DISCLOSURE.requirements.filter((r) => r.row === null)).toEqual([]);
    expect(FL_DISCLOSURE.requirements).toHaveLength(6);
  });
});
