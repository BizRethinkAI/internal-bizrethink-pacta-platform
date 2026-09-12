import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { FL_DISCLOSURE } from '../content/statutes/fl';
import { MO_DISCLOSURE } from '../content/statutes/mo';
import { normalisedDigest, readSourceText, sectionOf } from '../provenance/source-text';

// These independent captures were committed by the source audit before the
// correction. Comparing only a spec's digest with its own file allowed the old
// statutes to pass. This pins the reviewed versions, not continuing currency.
const evidence = (file: string) =>
  readFileSync(resolve(__dirname, '../../../../docs/research/mca-source-audit-2026-09-12/evidence', file), 'utf8');

const statutoryBody = (text: string) => text.split('--- STATUTORY TEXT BEGINS ---').at(-1) ?? '';

const ctSection = (text: string, number: number) =>
  text.slice(text.indexOf(`Sec. 36a-${number}.`)).split(/\nSec\. 36a-/)[0];

describe('the source corrections use the independently captured official versions', () => {
  it.each([868, 870, 872])('CT §36a-%s includes the 2026 supplement and history', (number) => {
    expect(normalisedDigest(ctSection(readSourceText('CT-CGS-36a-861-872.txt'), number))).toBe(
      normalisedDigest(ctSection(evidence('ct-2026-supplement-36a-868-870-872.txt'), number)),
    );
  });

  it('FL uses all six code sections, including the amended depository-institution definition', () => {
    expect(normalisedDigest(statutoryBody(readSourceText(FL_DISCLOSURE.sourceFile)))).toBe(
      normalisedDigest(evidence('fl-559.961-9615-2026.txt')),
    );
  });

  it('MO uses the 2025 code section, including the premium-finance exemption', () => {
    expect(normalisedDigest(statutoryBody(readSourceText(MO_DISCLOSURE.sourceFile)))).toBe(
      normalisedDigest(evidence('mo-427.300-2025.txt')),
    );
  });

  it('MO verifies labels within the disclosure subsection of the current code', () => {
    const current = evidence('mo-427.300-2025.txt');
    const disclosure = current.slice(current.indexOf('3. (1)'), current.indexOf('4. The provisions'));

    expect(normalisedDigest(sectionOf(readSourceText(MO_DISCLOSURE.sourceFile), MO_DISCLOSURE.section) ?? '')).toBe(
      normalisedDigest(disclosure),
    );
  });

  it('MO cites subsection 3(2), including the correct letter for each disclosure', () => {
    expect(MO_DISCLOSURE.citation).toBe('Mo. Rev. Stat. §427.300.3(2)');
    expect(MO_DISCLOSURE.source).toMatchObject({
      kind: 'statute',
      citation: MO_DISCLOSURE.citation,
    });
    expect(MO_DISCLOSURE.requirements.map((requirement) => requirement.citation)).toEqual(
      ['a', 'b', 'c', 'd', 'e', 'f'].map((letter) => `Mo. Rev. Stat. §427.300.3(2)(${letter})`),
    );
  });
});
