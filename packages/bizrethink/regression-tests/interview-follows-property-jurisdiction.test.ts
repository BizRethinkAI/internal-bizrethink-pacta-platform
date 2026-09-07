import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { jurisdictionForProperty } from '../lease/clauses/approval-jurisdiction';

/**
 * The builder asks the questions the property's state supports.
 *
 * #94 split the interview by jurisdiction and shipped it INERT: `interviewFor`
 * was called from nowhere and the builder went on importing `FL_INTERVIEW`
 * directly. Dead code that looks like a feature is worse than no code, because
 * the next person reads the split as done.
 *
 * WHAT IT PREVENTS. Florida asks the tenant to elect under §83.595(4). North
 * Carolina has no such provision. Asked of a North Carolina landlord, the
 * answer would be stored and then rendered into a clause with no statute behind
 * it — a term invented by a form. The guarantee is not "fewer questions", it is
 * that no question can produce an answer its jurisdiction cannot support.
 *
 * The split itself is proven in lease/__tests__/interview-jurisdiction.test.ts,
 * where a field is marked jurisdiction-specific exactly when every clause
 * consuming it belongs to that jurisdiction — DERIVED from the library, so it
 * self-maintains. This file guards the WIRING, which that test cannot see.
 */

const code = (path: string): string =>
  readFileSync(path, 'utf8')
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const BUILDER = join(__dirname, '../../../apps/remix/app/routes/_authenticated+/t.$teamUrl+/leases.$id.tsx');

describe('the builder interview follows the property, not Florida', () => {
  it('does not hard-wire the Florida interview', () => {
    expect(
      code(BUILDER),
      'the builder still imports FL_INTERVIEW; the jurisdiction split is inert while it does',
    ).not.toMatch(/\bFL_INTERVIEW\b/);
  });

  it('builds its steps from the jurisdiction', () => {
    expect(code(BUILDER)).toMatch(/\binterviewFor\b/);
  });

  /*
    The state has to REACH the page. It lives on the PROPERTY and the matter
    carries only a propertyId, so the loader has to select it and carry it —
    the page cannot derive it. The loader is the seam, not the tRPC procedure:
    this page reads its matter from the Remix loader.
  */
  it('selects the state from the property and carries it to the page', () => {
    const source = code(BUILDER);

    expect(source, 'the loader must select state from the property').toMatch(/state:\s*true/);
    expect(source, 'and carry it on the matter payload').toMatch(/propertyState/);
  });

  /*
    An unrecognised or missing state must not silently become "no questions".

    THE FALLBACK MOVED, AND THIS GUARD MOVED WITH IT. It asserted the literal
    `US-FL` in this page, because the page wrote the rule out itself. Three files
    did, and the third — the validate path — never did at all, so the rule now
    lives once in `jurisdictionForProperty` and the page asks for it. Asserting
    the literal here would now pass only by putting a fourth copy back.

    The substance is unchanged: the page derives its jurisdiction from the
    property, and the fallback is Florida.
  */
  it('falls back to Florida rather than to nothing', () => {
    expect(code(BUILDER)).toMatch(/jurisdictionForProperty\(/);
    expect(jurisdictionForProperty(null)).toBe('US-FL');
    expect(jurisdictionForProperty('ZZ')).toBe('US-FL');
  });
});
