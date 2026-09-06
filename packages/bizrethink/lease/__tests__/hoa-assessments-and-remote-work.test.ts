import { describe, expect, it } from 'vitest';

import { FL_LIBRARY } from '../clauses/us-fl';

/**
 * Two drafting defects a TENANT found, and the questions that fix them.
 *
 * Harsha Setty read the pilot lease as the tenant's side — the arrangement
 * `docs/STATE.md` describes, since the attorney candidate is his spouse and
 * cannot sign off a library her own household is party to. On the first pass he
 * returned three comments. One was a negotiating position. Two were defects.
 *
 * THE SERIOUS ONE. `hoa.compliance` bound the tenant to "all of the obligations
 * of the Owner under those governing documents". An owner's obligations under a
 * declaration INCLUDE PAYING THE ASSESSMENTS. Read literally, the lease handed
 * the HOA dues to the tenant — which no landlord using this builder intends,
 * and which the document nowhere else contradicts. He asked who pays. The lease
 * could not answer, while containing language suggesting he did.
 *
 * THE OVERBROAD ONE. `use.residential-only` forbade "any business or commercial
 * purpose", which on its face prohibits a physician reading charts at his
 * kitchen table. Every professional tenant breaches it on day one.
 *
 * WHERE EACH FIX BELONGS, per the boundary rule in CLAUDE.md: who pays an
 * assessment is a NEGOTIATED TERM of this lease — not Florida law, not fixed by
 * the declaration — so it is a question feeding a variable. Narrowing an
 * over-broad obligation is a DRAFTING fix, so it is library text. The two must
 * not be confused: hard-coding "Landlord pays the dues" would be the same error
 * as the parking-space text `hoa.lease-requirements` already records.
 */

const clause = (slug: string) => {
  const found = FL_LIBRARY.find((c) => c.slug === slug);

  expect(found, `${slug} is missing from the library`).toBeDefined();

  return found!;
};

/** `includeWhen` is optional on a Clause; these clauses must define one. */
const selectsWhen = (slug: string, facts: Record<string, boolean>): boolean => {
  const { includeWhen } = clause(slug);

  expect(includeWhen, `${slug} must gate itself, not render for every property`).toBeTypeOf('function');

  return includeWhen!(facts as never);
};

describe('hoa.compliance does not hand the assessments to the tenant', () => {
  /*
    The defect, pinned by the phrase that caused it. "All of the obligations of
    the Owner" is a superset that includes paying money the landlord means to
    pay.
  */
  it('does not bind the tenant to every obligation of the owner', () => {
    expect(clause('hoa.compliance').body).not.toMatch(/all of the obligations of the Owner/i);
  });

  it('binds the tenant to the use and conduct obligations, which is what was meant', () => {
    expect(clause('hoa.compliance').body).toMatch(/use|conduct/i);
  });

  /*
    Silence is what produced the question. The lease must say who pays, and must
    say it from an answer rather than an assumption.
  */
  it('states who pays the assessments, from a variable', () => {
    const c = clause('hoa.compliance');

    expect(c.body).toMatch(/\{\{assessmentsPaidBy\}\}/);
    expect(c.variables.map((v) => v.name)).toContain('assessmentsPaidBy');
  });

  /*
    THE BOUNDARY RULE. Who pays is a term, so it may never be a literal in
    clause text. If a future edit writes "Landlord" into the sentence, this
    fails.
  */
  it('does not hard-code a payer', () => {
    const body = clause('hoa.compliance').body;
    const afterVariable = body.replace(/\{\{assessmentsPaidBy\}\}/g, '<VAR>');

    expect(afterVariable).not.toMatch(/assessments[^.]*\bpayable by (Landlord|Tenant)\b/i);
  });
});

describe('CDD assessments are their own clause', () => {
  /*
    A community development district is not the association. It is a unit of
    local government under Ch. 190 Fla. Stat., its assessments are usually
    non-ad valorem charges on the tax bill, and a property can sit in one, the
    other, both or neither. Folding it into hoa.compliance would render CDD
    language for every association property in Florida — the mistake
    hoa.lease-requirements already documents.
  */
  it('exists, gated on the property actually being in one', () => {
    const c = clause('cdd.assessments');

    expect(c.jurisdiction, 'Ch. 190 is Florida law').toBe('US-FL');
    expect(selectsWhen('cdd.assessments', { hasCdd: false })).toBe(false);
    expect(selectsWhen('cdd.assessments', { hasCdd: true })).toBe(true);
  });

  it('states who pays, from a variable, and names the district', () => {
    const c = clause('cdd.assessments');

    expect(c.body).toMatch(/\{\{cddAssessmentsPaidBy\}\}/);
    expect(c.body).toMatch(/\{\{cddName\}\}/);

    const names = c.variables.map((v) => v.name);

    expect(names).toContain('cddAssessmentsPaidBy');
    expect(names).toContain('cddName');
  });

  it('is not selected merely because the property has an association', () => {
    expect(selectsWhen('cdd.assessments', { hasHoa: true, hasCdd: false })).toBe(false);
  });
});

describe('use.residential-only permits ordinary remote work', () => {
  /*
    The clause has to keep doing its job — no shopfront, no short-term letting,
    no unlawful use — while not prohibiting a laptop.
  */
  it('still forbids commercial use of the premises', () => {
    expect(clause('use.residential-only').body).toMatch(/private residence/i);
    expect(clause('use.residential-only').body).toMatch(/short-term|unlawful/i);
  });

  it('carves out remote work that leaves no trace on the property', () => {
    const body = clause('use.residential-only').body;

    expect(body).toMatch(/remote work|working remotely/i);

    // The carve-out is only safe if it is bounded. Each of these is what stops
    // "I work from home" becoming a business the neighbours can see.
    for (const bound of [/client|customer/i, /employee|staff/i, /sign(age|s)?\b/i]) {
      expect(body, `the carve-out must be bounded by ${bound}`).toMatch(bound);
    }
  });

  /*
    An association may forbid home occupation outright, and its documents win
    over a permissive lease term.
  */
  it('remains subject to the association documents', () => {
    expect(clause('use.residential-only').body).toMatch(/association|governing documents/i);
  });
});
