import { describe, expect, it } from 'vitest';
import type { LeaseParty } from '../render/signature-blocks';
import { buildSignatureBlocks, SIGNATURE_WIDGET } from '../render/signature-blocks';

/**
 * Signature blocks are not clauses. They are generated from the party list, so
 * a lease with two landlords and three tenants produces the right number of
 * blocks without anyone authoring a clause per combination.
 *
 * They are also where this reconnects to the Phase 0 spike. Every signature
 * placeholder carries explicit width/height meta so overlay 034 sizes the
 * widget properly, and every one of them therefore needs reserved leading —
 * a 44pt widget on an 11pt line grows ~16.5pt in each direction and will
 * silently overprint whatever sits above and below it.
 */

const PARTIES: LeaseParty[] = [
  { name: 'Shwet Prabhat', role: 'landlord' },
  { name: 'Ambika Prabhat', role: 'landlord' },
  { name: 'Tenant One', role: 'tenant' },
  { name: 'Tenant Two', role: 'tenant' },
];

describe('recipient numbering', () => {
  it('numbers every party once across the whole envelope', () => {
    const blocks = buildSignatureBlocks({ parties: PARTIES, documentKey: 'lease' });
    const recipients = blocks.flatMap((b) => b.signers.map((s) => s.recipient));

    expect(recipients).toEqual(['r1', 'r2', 'r3', 'r4']);
  });

  it('keeps a party on the same recipient number in every document', () => {
    // A signer must be one recipient across the lease and all its addenda,
    // or they would be asked to sign as several different people.
    const lease = buildSignatureBlocks({ parties: PARTIES, documentKey: 'lease' });
    const pets = buildSignatureBlocks({ parties: PARTIES, documentKey: 'addendum:pets.addendum' });

    const numberOf = (blocks: ReturnType<typeof buildSignatureBlocks>, name: string) =>
      blocks.flatMap((b) => b.signers).find((s) => s.name === name)?.recipient;

    expect(numberOf(lease, 'Tenant Two')).toBe('r4');
    expect(numberOf(pets, 'Tenant Two')).toBe('r4');
  });
});

describe('grouping', () => {
  it('groups landlords and tenants under their own headings', () => {
    const blocks = buildSignatureBlocks({ parties: PARTIES, documentKey: 'lease' });

    expect(blocks.map((b) => b.heading)).toEqual(['LANDLORD', 'TENANT']);
    expect(blocks[0].signers).toHaveLength(2);
    expect(blocks[1].signers).toHaveLength(2);
  });

  it('omits a heading with no parties under it', () => {
    const blocks = buildSignatureBlocks({
      parties: [{ name: 'Sole Owner', role: 'landlord' }],
      documentKey: 'lease',
    });

    expect(blocks.map((b) => b.heading)).toEqual(['LANDLORD']);
  });
});

describe('the placeholders each signer gets', () => {
  it('emits name, signature and date in draw order', () => {
    const [landlord] = buildSignatureBlocks({ parties: PARTIES, documentKey: 'lease' });
    const signer = landlord.signers[0];

    // Extraction follows draw order within a page, so the order here is what
    // the auto-placer will see.
    expect(signer.placeholders.map((p) => p.token)).toEqual([
      '{{NAME, r1}}',
      `{{SIGNATURE, r1, width=${SIGNATURE_WIDGET.width}, height=${SIGNATURE_WIDGET.height}}}`,
      '{{DATE, r1}}',
    ]);
  });

  it('reserves leading around the sized signature and nowhere else', () => {
    const [landlord] = buildSignatureBlocks({ parties: PARTIES, documentKey: 'lease' });
    const [name, signature, date] = landlord.signers[0].placeholders;

    // (44 - 11) / 2 = 16.5pt above and below.
    expect(signature.reservedLeadingPt).toBe(16.5);
    expect(name.reservedLeadingPt).toBe(0);
    expect(date.reservedLeadingPt).toBe(0);
  });

  it('reserves nothing when the widget is no taller than the line', () => {
    const blocks = buildSignatureBlocks({
      parties: [{ name: 'A', role: 'tenant' }],
      documentKey: 'lease',
      widget: { width: 160, height: 11 },
    });

    expect(blocks[0].signers[0].placeholders[1].reservedLeadingPt).toBe(0);
  });
});

describe('initials', () => {
  it('adds an initials placeholder per signer when asked', () => {
    const blocks = buildSignatureBlocks({
      parties: PARTIES,
      documentKey: 'addendum:rules.house-rules',
      withInitials: true,
    });

    const tokens = blocks.flatMap((b) => b.signers.flatMap((s) => s.placeholders.map((p) => p.token)));

    expect(tokens).toContain('{{INITIALS, r3}}');
    expect(tokens.filter((t) => t.startsWith('{{INITIALS'))).toHaveLength(4);
  });

  it('leaves them out by default', () => {
    const blocks = buildSignatureBlocks({ parties: PARTIES, documentKey: 'lease' });
    const tokens = blocks.flatMap((b) => b.signers.flatMap((s) => s.placeholders.map((p) => p.token)));

    expect(tokens.some((t) => t.startsWith('{{INITIALS'))).toBe(false);
  });
});

describe('what the auto-placer will be handed', () => {
  it('produces tokens the upstream placeholder grammar accepts', () => {
    const blocks = buildSignatureBlocks({
      parties: PARTIES,
      documentKey: 'lease',
      withInitials: true,
    });

    // `{{TYPE, rN}}` with optional `key=value` pairs — the shape
    // extractPlaceholdersFromPDF parses. A token outside it is skipped
    // silently, which would mean a missing signature field on a real lease.
    const grammar = /^\{\{(SIGNATURE|NAME|DATE|INITIALS|EMAIL|TEXT|NUMBER), r\d+(, \w+=[^,}]+)*\}\}$/;

    for (const block of blocks) {
      for (const signer of block.signers) {
        for (const placeholder of signer.placeholders) {
          expect(placeholder.token).toMatch(grammar);
        }
      }
    }
  });
});
