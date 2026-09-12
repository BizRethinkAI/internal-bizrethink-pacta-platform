import { describe, expect, it } from 'vitest';

import { describeClauseVariance, describeWhyThisClause } from '../metadata';

describe('metadata a reviewer can read', () => {
  it('distinguishes prescribed text, implementing wording and commercial drafting', () => {
    expect(
      describeWhyThisClause({
        kind: 'compelled',
        citation: '7 TAC §86.310(d)',
        appliesWhen: 'Texas coverage applies.',
      }),
    ).toBe('Required wording — 7 TAC §86.310(d). Applies when: Texas coverage applies.');
    expect(describeWhyThisClause({ kind: 'implements', citation: 'Va. Code §6.2-2234(B)' })).toBe(
      'Implements a legal duty; wording is ours — Va. Code §6.2-2234(B).',
    );
    expect(describeWhyThisClause({ kind: 'discretionary' })).toBe(
      'Commercial drafting — no statute requires this clause.',
    );
  });

  it('explains a fixed clause and names a funder choice without exposing a field key', () => {
    expect(
      describeClauseVariance({ kind: 'fixed', because: 'unwritable', note: 'The funder’s state is not collected.' }),
    ).toBe('Fixed wording — The funder’s state is not collected.');
    expect(describeClauseVariance({ kind: 'offered', fact: 'guarantyScope' })).toBe('Funder choice — Guaranty scope.');
  });
});
