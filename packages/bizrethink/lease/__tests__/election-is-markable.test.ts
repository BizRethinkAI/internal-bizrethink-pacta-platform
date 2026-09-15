import { extractPlaceholdersFromPDF } from '@documenso/lib/server-only/pdf/auto-place-fields';
import { FieldType } from '@prisma/client';
import { beforeAll, describe, expect, it } from 'vitest';

import { PICANA_FACTS, PICANA_MONEY, PICANA_PARTIES, PICANA_VALUES } from '../matters/picana-ln';
import { markCells } from '../render/election-marks';
import { PAD_H } from '../render/lease-document';
import type { RenderLeaseResult } from '../render/render-lease';
import { renderLease } from '../render/render-lease';

/**
 * AN ELECTION IS ONLY AN ELECTION IF EVERY PERSON WHO MAKES IT CAN MARK IT.
 *
 * §83.595(4)'s early-termination addendum first shipped as the literal
 * characters "[ ]". Fixed with a checkbox — for the FIRST tenant only, so on
 * the 2026-09-15 pilot lease one of two jointly liable tenants had nothing to
 * mark. The §83.505 electronic-notice addendum still printed "[ ]" for both
 * landlords and both tenants: nothing a signer could click, so the election the
 * lease's notice clause relies on could never be made.
 *
 * And where there was a box, blanking its token left a wide gap before the
 * option's words. Options now run full width, with a row of marks beneath —
 * one cell per person, their name over their own box.
 */

type Placeholders = Awaited<ReturnType<typeof extractPlaceholdersFromPDF>>;

let result: RenderLeaseResult;
const fieldsByDocument: Record<string, Placeholders> = {};

beforeAll(async () => {
  result = await renderLease({
    facts: { ...PICANA_FACTS, earlyTerminationOffered: true, electronicNoticesElected: true },
    money: PICANA_MONEY,
    values: PICANA_VALUES,
    parties: PICANA_PARTIES,
    propertyAddress: '29090 Picana Lane, Wesley Chapel, Florida 33543',
  });

  for (const doc of result.rendered) {
    fieldsByDocument[doc.key] = await extractPlaceholdersFromPDF(Buffer.from(doc.pdf));
  }
}, 120_000);

const recipientsOf = (role: 'landlord' | 'tenant') =>
  PICANA_PARTIES.flatMap((party, index) => (party.role === role ? [`r${index + 1}`] : []));

const checkboxesIn = (key: string) =>
  (fieldsByDocument[Object.keys(fieldsByDocument).find((each) => each.includes(key)) ?? ''] ?? []).filter(
    (field) => field.fieldAndMeta.type === FieldType.CHECKBOX,
  );

const countBy = (fields: Placeholders) =>
  fields.reduce<Record<string, number>>((counts, field) => {
    counts[field.recipient] = (counts[field.recipient] ?? 0) + 1;

    return counts;
  }, {});

const textOf = async (key: string) => {
  const doc = result.rendered.find((each) => each.key.includes(key));
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const parsed = await pdfjs.getDocument({ data: new Uint8Array(doc!.pdf) }).promise;
  const items: { str: string; x: number }[] = [];

  for (let n = 1; n <= parsed.numPages; n += 1) {
    const content = await (await parsed.getPage(n)).getTextContent();

    for (const item of content.items) {
      if ('str' in item) {
        items.push({ str: item.str, x: item.transform[4] });
      }
    }
  }

  return items;
};

describe('the early-termination election (§83.595(4))', () => {
  it('gives EVERY tenant a box on both options, and no landlord any', () => {
    const counts = countBy(checkboxesIn('early-election'));

    expect(Object.keys(counts).sort()).toEqual(recipientsOf('tenant').sort());

    for (const recipient of recipientsOf('tenant')) {
      expect(counts[recipient], recipient).toBe(2);
    }
  });
});

describe('the electronic-notice elections (§83.505)', () => {
  it('gives every landlord and every tenant a box on both options of their own election', () => {
    const counts = countBy(checkboxesIn('electronic-delivery'));

    expect(Object.keys(counts).sort()).toEqual([...recipientsOf('landlord'), ...recipientsOf('tenant')].sort());

    for (const recipient of Object.keys(counts)) {
      expect(counts[recipient], recipient).toBe(2);
    }
  });
});

describe('what a signer reads', () => {
  for (const key of ['early-election', 'electronic-delivery']) {
    it(`${key}: no bracket, no marker, and every option starts at the margin`, async () => {
      const items = await textOf(key);
      const text = items.map((item) => item.str).join('');

      expect(text).not.toMatch(/\[\s*\]/);
      expect(text).not.toContain('[[');

      const options = items.filter((item) => /^I (do not )?agree/.test(item.str.trim()));

      expect(options.length).toBeGreaterThan(0);

      for (const option of options) {
        expect(option.x, option.str).toBeLessThan(PAD_H + 2);
      }
    });
  }

  it('names each person over their own box', async () => {
    const text = (await textOf('early-election')).map((item) => item.str).join(' ');

    for (const cell of markCells(PICANA_PARTIES, 'tenant')) {
      expect(text).toContain(cell.name);
    }
  });
});

describe('markCells', () => {
  /*
    A recipient index is POSITIONAL: `signature-blocks.ts` numbers signers
    r1..rN over the party list, so a person's box must follow them wherever
    they sit in it. A hard-coded r2 puts the tenant's election in front of a
    landlord on the next lease.
  */
  it('follows each person wherever they sit in the party list', () => {
    const parties = [
      { name: 'Tenant A', role: 'tenant' as const },
      { name: 'Landlord', role: 'landlord' as const },
      { name: 'Tenant B', role: 'tenant' as const },
    ];

    expect(markCells(parties, 'tenant')).toEqual([
      { name: 'Tenant A', token: '{{CHECKBOX, r1}}' },
      { name: 'Tenant B', token: '{{CHECKBOX, r3}}' },
    ]);
    expect(markCells(parties, 'landlord')).toEqual([{ name: 'Landlord', token: '{{CHECKBOX, r2}}' }]);
  });
});
