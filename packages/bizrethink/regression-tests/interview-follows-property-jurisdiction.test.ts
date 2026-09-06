import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

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
const ROUTER = join(__dirname, '../server-only/trpc/lease-builder-router.ts');

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
    The state has to REACH the page. It lives on the property, and the matter
    carries only a propertyId, so the payload has to say so explicitly — the
    page cannot derive it.
  */
  it('is given the property state by the matter payload', () => {
    expect(code(ROUTER), 'matter.get must expose propertyState').toMatch(/propertyState/);
    expect(code(BUILDER), 'the page must read propertyState').toMatch(/propertyState/);
  });

  /*
    An unrecognised or missing state must not silently become "no questions".
    Florida is the only state with clauses of its own today, so it is the
    fallback — and the fallback stops being harmless the moment a second state
    has any, which is why this is pinned rather than left to read naturally.
  */
  it('falls back to Florida rather than to nothing', () => {
    expect(code(BUILDER)).toMatch(/US-FL/);
  });
});
