import { describe, expect, it } from 'vitest';
import { MCA_FUNDING_FIELDS } from '../clauses/fields';
import type { ClauseField } from '../clauses/types';
import { fieldRows, fieldSpan } from './field-layout';

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
