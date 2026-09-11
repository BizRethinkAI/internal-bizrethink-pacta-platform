import { extractPlaceholdersFromPDF } from '@documenso/lib/server-only/pdf/auto-place-fields';
import { FieldType } from '@prisma/client';
import { beforeAll, describe, expect, it } from 'vitest';

import { PICANA_FACTS, PICANA_MONEY, PICANA_PARTIES, PICANA_VALUES } from '../matters/picana-ln';
import { tenantElectionBox } from '../parties/derive-parties';
import { renderLease } from '../render/render-lease';

/**
 * THE ELECTION §83.595(4) PRESCRIBES MUST BE MAKEABLE.
 *
 * The addendum offered two options as the literal characters "[ ]" — no field,
 * no widget, nothing to click. On its own terms ("If neither is marked, no
 * early termination fee is agreed") that lost the landlord the
 * liquidated-damages remedy by default, on every lease, silently.
 *
 * Nothing caught it: the text was right, the statute was cited correctly, the
 * addendum rendered and signed. Only opening the signing view — or reading the
 * PDF for fields rather than for words — shows that the choice cannot be made.
 */

let addendum: Awaited<ReturnType<typeof extractPlaceholdersFromPDF>>;

beforeAll(async () => {
  const { rendered } = await renderLease({
    facts: PICANA_FACTS,
    money: PICANA_MONEY,
    values: PICANA_VALUES,
    parties: PICANA_PARTIES,
    propertyAddress: '29090 Picana Lane, Wesley Chapel, Florida 33543',
  });

  const doc = rendered.find((each) => each.key.includes('early-election'));

  expect(doc, 'the early-termination addendum must render').toBeDefined();

  addendum = await extractPlaceholdersFromPDF(doc!.pdf);
}, 120_000);

describe('the early-termination election can be marked', () => {
  it('places exactly two checkboxes — an election needs two options', () => {
    const boxes = addendum.filter((field) => field.fieldAndMeta.type === FieldType.CHECKBOX);

    expect(boxes).toHaveLength(2);
  });

  /*
    AND THEY BELONG TO THE TENANT. §83.595(4) is the tenant's election to make;
    a box in front of a landlord is not one. The recipient index is positional,
    so this is the assertion that would have caught a hard-coded "r2".
  */
  it('assigns them to a tenant, not to a landlord', () => {
    const firstTenantAt = PICANA_PARTIES.findIndex((party) => party.role === 'tenant');

    for (const box of addendum.filter((field) => field.fieldAndMeta.type === FieldType.CHECKBOX)) {
      expect(box.recipient).toBe(`r${firstTenantAt + 1}`);
    }
  });

  it('leaves no dead "[ ]" bracket behind', async () => {
    const { rendered } = await renderLease({
      facts: PICANA_FACTS,
      money: PICANA_MONEY,
      values: PICANA_VALUES,
      parties: PICANA_PARTIES,
      propertyAddress: '29090 Picana Lane, Wesley Chapel, Florida 33543',
    });

    const doc = rendered.find((each) => each.key.includes('early-election'))!;
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const parsed = await pdfjs.getDocument({ data: new Uint8Array(doc.pdf), useSystemFonts: false }).promise;

    let text = '';

    for (let n = 1; n <= parsed.numPages; n += 1) {
      const content = await (await parsed.getPage(n)).getTextContent();

      for (const item of content.items) {
        if ('str' in item) {
          text += item.str;
        }
      }
    }

    expect(text).not.toMatch(/\[\s*\]/);
  }, 120_000);
});

describe('the election token is derived from the party order, never literal', () => {
  /*
    `signature-blocks` numbers signers r1..rN over the party list, so the
    tenant's index moves with the order the parties were entered in.
  */
  it('follows the tenant wherever they sit in the list', () => {
    expect(
      tenantElectionBox([
        { name: 'L', role: 'landlord', email: 'l@example.com' },
        { name: 'T', role: 'tenant', email: 't@example.com' },
      ]),
    ).toBe('{{CHECKBOX, r2}}');

    expect(
      tenantElectionBox([
        { name: 'T', role: 'tenant', email: 't@example.com' },
        { name: 'L', role: 'landlord', email: 'l@example.com' },
      ]),
    ).toBe('{{CHECKBOX, r1}}');
  });

  it('renders nothing rather than a broken token when there is no tenant', () => {
    expect(tenantElectionBox([{ name: 'L', role: 'landlord', email: 'l@example.com' }])).toBe('');
  });
});
