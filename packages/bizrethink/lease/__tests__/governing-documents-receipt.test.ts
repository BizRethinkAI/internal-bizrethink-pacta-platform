import { describe, expect, it } from 'vitest';
import type { ClauseFacts } from '../clauses/types';
import { FL_LIBRARY } from '../clauses/us-fl';

/*
  The lease binds the tenant to the association's governing documents. A tenant
  who was never given them has the obvious answer, and this is the clause that
  removes it.

  It is deliberately NOT gated on `hasHoa` alone. An association exists is not
  the same as its documents are attached, and a receipt for nothing is worse
  than no receipt — it is a signed statement that the tenant received documents
  they did not.
*/

const clause = () => {
  const found = FL_LIBRARY.find((c) => c.slug === 'hoa.governing-documents-receipt');
  if (!found) {
    throw new Error('hoa.governing-documents-receipt is missing');
  }
  return found;
};

const facts = (over: Partial<ClauseFacts> = {}): ClauseFacts =>
  ({ hasHoa: true, hasHoaGoverningDocuments: true, ...over }) as ClauseFacts;

describe('hoa.governing-documents-receipt', () => {
  it('is an addendum, so the receipt is a page the tenant signs', () => {
    expect(clause().placement).toBe('addendum');
  });

  it('appears only when documents are actually attached', () => {
    const { includeWhen } = clause();
    expect(includeWhen).not.toBeNull();
    expect(includeWhen?.(facts())).toBe(true);
    expect(includeWhen?.(facts({ hasHoaGoverningDocuments: false }))).toBe(false);
    expect(includeWhen?.(facts({ hasHoa: false }))).toBe(false);
  });

  it('names the documents from data rather than stating any of them', () => {
    const { body, variables } = clause();

    expect(body).toContain('{{governingDocuments}}');
    expect(variables.map((v) => v.name)).toContain('governingDocuments');
  });

  /*
    The boundary rule, applied to the clause written the same week it landed.
    Whatever Estancia recorded is data; this clause must read true for a
    condominium in Miami-Dade with a different rulebook entirely.
  */
  it('states no instrument, community or quantity of its own', () => {
    const { body } = clause();
    const withoutVars = body.replace(/\{\{[^}]*\}\}/g, '');

    expect(withoutVars).not.toMatch(/Instr#|OR \d+\/\d+|Estancia|Pasco/i);
    expect(withoutVars).not.toMatch(/\b(\d+|one|two|three|four|five)\b/i);
  });

  it('claims no statute, because none requires it', () => {
    expect(clause().requiredBy).toBeUndefined();
  });
});
