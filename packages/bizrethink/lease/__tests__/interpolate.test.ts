import { describe, expect, it } from 'vitest';
import type { ClauseVariable } from '../clauses/types';
import { interpolateClause } from '../render/interpolate';

/**
 * Substituting values into clause text.
 *
 * Two things make this less trivial than a string replace. First, a missing
 * value must never render `{{repairThresholdUsd}}` into a signed lease — it
 * fails loudly instead. Second, signature placeholders live in the same
 * `{{...}}` syntax but are NOT clause variables: they have to survive
 * untouched, because upstream's auto-placer reads them out of the finished PDF
 * to position the signing fields.
 */

const vars = (...names: [string, ClauseVariable['type']][]): ClauseVariable[] =>
  names.map(([name, type]) => ({ name, type, label: name, required: true }));

describe('substitution', () => {
  it('replaces a declared variable with its value', () => {
    const result = interpolateClause({
      body: 'Tenant shall pay rent of {{monthlyRentUsd}} per month.',
      variables: vars(['monthlyRentUsd', 'usd']),
      values: { monthlyRentUsd: 6900 },
    });

    expect(result.text).toBe('Tenant shall pay rent of $6,900.00 per month.');
    expect(result.missing).toEqual([]);
  });

  it('replaces every occurrence', () => {
    const result = interpolateClause({
      body: '{{name}} agrees. {{name}} acknowledges.',
      variables: vars(['name', 'string']),
      values: { name: 'Tenant' },
    });

    expect(result.text).toBe('Tenant agrees. Tenant acknowledges.');
  });
});

describe('formatting by type', () => {
  it('formats usd with a symbol, thousands and two decimals', () => {
    const result = interpolateClause({
      body: '{{a}} and {{b}}',
      variables: vars(['a', 'usd'], ['b', 'usd']),
      values: { a: 13800, b: 250.5 },
    });

    expect(result.text).toBe('$13,800.00 and $250.50');
  });

  it('formats a date in long form rather than ISO', () => {
    const result = interpolateClause({
      body: 'begins on {{startDate}}',
      variables: vars(['startDate', 'date']),
      values: { startDate: '2026-10-01' },
    });

    expect(result.text).toBe('begins on 1 October 2026');
  });

  it('leaves numbers unformatted', () => {
    const result = interpolateClause({
      body: 'day {{rentDueDay}} of each month',
      variables: vars(['rentDueDay', 'number']),
      values: { rentDueDay: 1 },
    });

    expect(result.text).toBe('day 1 of each month');
  });
});

describe('missing values fail loudly', () => {
  it('reports a required variable with no value', () => {
    const result = interpolateClause({
      body: 'threshold is {{repairThresholdUsd}}',
      variables: vars(['repairThresholdUsd', 'usd']),
      values: {},
    });

    expect(result.missing).toEqual(['repairThresholdUsd']);
  });

  it('leaves the token visible rather than rendering an empty gap', () => {
    // A blank where a figure should be reads as a completed document with no
    // threshold. The token reads as obviously unfinished.
    const result = interpolateClause({
      body: 'threshold is {{repairThresholdUsd}}',
      variables: vars(['repairThresholdUsd', 'usd']),
      values: {},
    });

    expect(result.text).toContain('{{repairThresholdUsd}}');
  });

  it('treats null and empty string as missing', () => {
    const result = interpolateClause({
      body: '{{a}} {{b}}',
      variables: vars(['a', 'string'], ['b', 'string']),
      values: { a: null, b: '' },
    });

    expect(result.missing).toEqual(['a', 'b']);
  });

  it('does not treat zero as missing', () => {
    // $0.00 due at execution is a real and important answer.
    const result = interpolateClause({
      body: '{{depositDueAtExecutionUsd}} is payable',
      variables: vars(['depositDueAtExecutionUsd', 'usd']),
      values: { depositDueAtExecutionUsd: 0 },
    });

    expect(result.missing).toEqual([]);
    expect(result.text).toBe('$0.00 is payable');
  });
});

describe('signature placeholders are not clause variables', () => {
  it('leaves a signature token completely untouched', () => {
    // If interpolation ate this, the auto-placer would find no field and the
    // lease would go out with nowhere to sign.
    const body = 'Signed: {{SIGNATURE, r1, width=160, height=44}}';
    const result = interpolateClause({ body, variables: [], values: {} });

    expect(result.text).toBe(body);
    expect(result.missing).toEqual([]);
  });

  it('leaves every field-placeholder type untouched', () => {
    const body = '{{NAME, r1}} {{DATE, r2}} {{INITIALS, r3}} {{TEXT, r4}}';
    const result = interpolateClause({ body, variables: [], values: {} });

    expect(result.text).toBe(body);
  });

  it('substitutes a clause variable sitting beside a signature token', () => {
    const result = interpolateClause({
      body: '{{tenantNames}} signs here: {{SIGNATURE, r1, width=160, height=44}}',
      variables: vars(['tenantNames', 'string']),
      values: { tenantNames: 'Alex Roe' },
    });

    expect(result.text).toBe('Alex Roe signs here: {{SIGNATURE, r1, width=160, height=44}}');
  });

  it('ignores an undeclared lowercase token instead of claiming it is missing', () => {
    // Not a declared variable, so not this clause's business. The library
    // invariant already asserts bodies declare what they interpolate.
    const result = interpolateClause({ body: 'see {{somethingElse}}', variables: [], values: {} });

    expect(result.missing).toEqual([]);
    expect(result.text).toBe('see {{somethingElse}}');
  });
});
