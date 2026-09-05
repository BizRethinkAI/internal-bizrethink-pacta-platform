import { describe, expect, it } from 'vitest';
import type { ClauseFacts } from '../clauses/types';
import { FL_LIBRARY } from '../clauses/us-fl';
import { describeDocuments } from '../documents/derive-documents';

/*
  The move-in inspection for one house ran to 418 pages of photographs and ended
  with a signature block reading "Jack Lipstein, Property Manager". The tenant
  never signed it.

  That is the gap this closes. A condition record signed only by the landlord's
  own agent is the landlord's account of the property, and Fla. Stat.
  §83.49(3)(a) gives thirty days to claim against the deposit — a claim that
  rests on what the place looked like at move-in. The capture was already good;
  it stopped one signature short.
*/

const clause = () => {
  const found = FL_LIBRARY.find((c) => c.slug === 'condition.report-receipt');
  if (!found) {
    throw new Error('condition.report-receipt is missing');
  }
  return found;
};

const facts = (over: Partial<ClauseFacts> = {}): ClauseFacts => ({ hasConditionReport: true, ...over }) as ClauseFacts;

describe('condition.report-receipt', () => {
  it('is an addendum the tenant signs', () => {
    expect(clause().placement).toBe('addendum');
  });

  it('appears only when a condition report is actually attached', () => {
    const { includeWhen } = clause();
    expect(includeWhen?.(facts())).toBe(true);
    expect(includeWhen?.(facts({ hasConditionReport: false }))).toBe(false);
  });

  it('names the report from data, and states its own objection window as a variable', () => {
    const { body, variables } = clause();
    const names = variables.map((v) => v.name);

    expect(body).toContain('{{conditionReports}}');
    expect(names).toContain('conditionReports');

    /*
      Florida sets no objection window, so the number is the landlord's choice
      and has to be one. A figure written into the body would be this library
      asserting a deadline no statute supports, on every lease.
    */
    expect(body).toContain('{{conditionObjectionDays}}');
    expect(names).toContain('conditionObjectionDays');
    expect(body.replace(/\{\{[^}]*\}\}/g, '')).not.toMatch(/\b\d+\b/);
  });

  /*
    The receipt has to say what the tenant is agreeing to. "I received it" is
    not the same as "this is what the place looked like", and only the second
    is worth anything thirty days after move-out.
  */
  it('records agreement with the condition, not merely receipt of a file', () => {
    expect(clause().body).toMatch(/condition/i);
  });

  it('claims no statute, because Florida requires no inspection at all', () => {
    expect(clause().requiredBy).toBeUndefined();
  });
});

describe('the condition report is listed apart from the governing documents', () => {
  it('does not appear in the association receipt, and vice versa', () => {
    const rows = [
      { id: 'a', kind: 'hoa-governing' as const, label: 'Declaration', reference: '', documentDate: '', pageCount: 90 },
      {
        id: 'b',
        kind: 'move-in-report' as const,
        label: 'Move-in Inspection',
        reference: '',
        documentDate: '2025-01-06',
        pageCount: 418,
      },
    ];

    expect(describeDocuments(rows, 'hoa-governing')).toBe('1. Declaration (90 pages)');
    expect(describeDocuments(rows, 'move-in-report')).toBe('1. Move-in Inspection, dated 6 January 2025 (418 pages)');
  });
});
