import { describe, expect, it } from 'vitest';
import { MCA_FUNDING_FIELDS } from '../clauses/fields';
import type { ClauseField } from '../clauses/types';
import { fieldBlocks, fieldRows, fieldSpan } from './field-layout';

const field = (binding: string, label: string, kind: ClauseField['kind'] = 'text'): ClauseField => ({
  binding,
  label,
  widget: `{{field:${binding}}}`,
  kind,
  required: true,
});

/**
 * The gap this closes: Pacta printed every field as a full-width stacked row,
 * so Section 1 alone ran three pages and the FRPA ran 37 against the real
 * document's 23. The real §1 prints two fields to a row.
 */
describe('a completed field is as wide as its answer', () => {
  it('keeps an address on its own row', () => {
    expect(fieldSpan(field('merchant.businessAddress', 'Merchant — Business Address'))).toBe('full');
    expect(fieldSpan(field('provider.noticeAddress', 'Notice Address'))).toBe('full');
  });

  it('pairs a short answer even when its label mentions an address', () => {
    expect(fieldSpan(field('merchant.formationState', 'Merchant — State of Formation'))).toBe('half');
  });

  it('gives the merchant name the measure, because a legal name is long', () => {
    expect(fieldSpan(field('merchant.legalName', 'Merchant — Legal Name'))).toBe('full');
  });

  it('defaults an unclassified field to half, so it joins the grid', () => {
    expect(fieldSpan(field('funding.someNewFigure', 'Funding Terms — Some New Figure', 'currency'))).toBe('half');
  });

  it('resolves a span for every current document field', () => {
    for (const current of MCA_FUNDING_FIELDS) {
      expect(['half', 'full'], current.binding).toContain(fieldSpan(current));
    }
  });
});

describe('rows follow the document, not the packing', () => {
  it('pairs two consecutive halves', () => {
    const rows = fieldRows([field('a.one', 'One'), field('a.two', 'Two')]);

    expect(rows).toHaveLength(1);
    expect(rows[0].map((entry) => entry.binding)).toEqual(['a.one', 'a.two']);
  });

  it('never reorders to fill a row', () => {
    const rows = fieldRows([
      field('a.one', 'One'),
      field('a.address', 'Business Address'),
      field('a.two', 'Two'),
      field('a.three', 'Three'),
    ]);

    expect(rows.map((row) => row.map((entry) => entry.binding))).toEqual([
      ['a.one'],
      ['a.address'],
      ['a.two', 'a.three'],
    ]);
  });

  it('leaves a trailing half alone in its row', () => {
    const rows = fieldRows([field('a.one', 'One'), field('a.two', 'Two'), field('a.three', 'Three')]);

    expect(rows.map((row) => row.length)).toEqual([2, 1]);
  });

  it('accounts for every field exactly once', () => {
    const rows = fieldRows(MCA_FUNDING_FIELDS);

    expect(rows.flat()).toHaveLength(MCA_FUNDING_FIELDS.length);
    expect(rows.flat().map((entry) => entry.binding)).toEqual(MCA_FUNDING_FIELDS.map((entry) => entry.binding));
  });
});

/**
 * Money is a column, not a grid cell.
 *
 * The real documents set the itemization as label-left, figure-right with the
 * amounts aligned on one edge, so a reader can compare them down the column.
 * Rendered as half-width grid cells, the same figures land wherever the pairing
 * puts them.
 */
describe('figures line up in a column', () => {
  const money = (binding: string, label: string): ClauseField => field(binding, label, 'currency');

  it('takes consecutive currency fields out of the grid', () => {
    const blocks = fieldBlocks([
      field('merchant.legalName', 'Merchant — Legal Name'),
      money('funding.purchasePrice', 'Itemization — Purchase Price'),
      money('funding.originationFee', 'Itemization — Origination Fee'),
      field('funding.collectionFrequency', 'Funding Terms — Settlement Frequency'),
    ]);

    expect(blocks.map((block) => block.kind)).toEqual(['grid', 'money', 'grid']);
    expect(blocks[1].fields.map((entry) => entry.binding)).toEqual(['funding.purchasePrice', 'funding.originationFee']);
  });

  it('keeps every field, in document order', () => {
    const fields = [money('a.one', 'One'), field('a.two', 'Two'), money('a.three', 'Three'), money('a.four', 'Four')];
    const blocks = fieldBlocks(fields);

    expect(blocks.flatMap((block) => block.fields).map((entry) => entry.binding)).toEqual(
      fields.map((entry) => entry.binding),
    );
  });

  it('does not make a column out of a lone figure', () => {
    const blocks = fieldBlocks([field('a.one', 'One'), money('a.amount', 'Amount'), field('a.two', 'Two')]);

    expect(blocks.map((block) => block.kind)).toEqual(['grid']);
  });
});

describe('a rate inside an itemization stays in the column', () => {
  it('bridges a single non-currency field between two money blocks', () => {
    const blocks = fieldBlocks([
      field('funding.purchasePrice', 'Itemization — Purchase Price', 'currency'),
      field('funding.originationFeePercentage', 'Itemization — Origination Fee Percentage'),
      field('funding.originationFee', 'Itemization — Origination Fee Deducted', 'currency'),
    ]);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].kind).toBe('money');
    expect(blocks[0].fields).toHaveLength(3);
  });

  it('does not bridge two ordinary answers', () => {
    const blocks = fieldBlocks([
      field('a.amount', 'Amount', 'currency'),
      field('a.one', 'One'),
      field('a.two', 'Two'),
      field('a.total', 'Total', 'currency'),
    ]);

    expect(blocks.map((block) => block.kind)).toEqual(['grid']);
  });
});
