import { describe, expect, it } from 'vitest';

import { FL_LIBRARY, FL_SECTION_ORDER } from '../clauses/us-fl';
import type { InterviewAnswers } from '../interview/steps';
import { allFields, DERIVED_FACTS, DERIVED_VALUES, FL_INTERVIEW, visibleSteps } from '../interview/steps';
import { PICANA_FACTS, PICANA_MONEY, PICANA_VALUES } from '../matters/picana-ln';

/**
 * The interview is the part a human touches, and the way it fails is by being
 * incomplete: a clause interpolates {{repairThresholdUsd}}, no step ever asks
 * for it, and the lease renders with a raw token in it. Nothing errors.
 *
 * So the load-bearing test here is coverage — every variable the 47 clauses
 * can interpolate is either asked by a step or derived from something that is.
 */

const answers = (overrides: Partial<InterviewAnswers> = {}): InterviewAnswers => ({
  facts: PICANA_FACTS,
  money: PICANA_MONEY,
  values: PICANA_VALUES,
  customClauses: [],
  ...overrides,
});

describe('coverage — the interview must be able to fill the document', () => {
  it('asks for, or derives, every variable the library interpolates', () => {
    const needed = new Set(FL_LIBRARY.flatMap((c) => c.variables.map((v) => v.name)));
    const asked = new Set(allFields(FL_INTERVIEW).map((f) => f.name));

    const uncovered = [...needed].filter((name) => !asked.has(name) && !DERIVED_VALUES.includes(name));

    expect(
      uncovered,
      'These clause variables have no interview field and are not derived. A lease would ' +
        'render with the raw {{token}} visible and nothing would error.',
    ).toEqual([]);
  });

  it('asks for every fact that drives clause selection', () => {
    const needed = Object.keys(PICANA_FACTS);
    const asked = new Set(
      allFields(FL_INTERVIEW)
        .filter((f) => f.target === 'fact')
        .map((f) => f.name),
    );

    const uncovered = needed.filter((name) => !asked.has(name) && !DERIVED_FACTS.includes(name));

    expect(
      uncovered,
      'These ClauseFacts are neither asked nor derived, so the answers cannot change which ' +
        'clauses are selected — the document would silently be built on defaults.',
    ).toEqual([]);
  });

  it('asks nothing the engine has no use for', () => {
    const known = new Set([
      ...FL_LIBRARY.flatMap((c) => c.variables.map((v) => v.name)),
      ...Object.keys(PICANA_FACTS),
      'monthlyUsd',
      'dueDayOfMonth',
      'startDate',
      'securityUsd',
      'alreadyHeldUsd',
      'advanceRentUsd',
      'advanceRentHeldUsd',
      'prepaidRentUsd',
      'prorationMethod',
    ]);

    const orphans = allFields(FL_INTERVIEW)
      .filter((f) => !known.has(f.name))
      .map((f) => f.name);

    expect(orphans, 'Fields nobody consumes waste the answerer time.').toEqual([]);
  });
});

describe('the teaching layer', () => {
  it('gives every field a plain-language question', () => {
    for (const field of allFields(FL_INTERVIEW)) {
      expect(field.label.length, `${field.name} has no label`).toBeGreaterThan(0);
      // A label that is just the variable name is a form, not an interview.
      expect(field.label).not.toBe(field.name);
    }
  });

  it('cites the statute on every field a statute constrains', () => {
    // Completion without understanding is the failure mode. Where Florida
    // dictates a limit, the answerer sees the limit and the citation.
    const constrained = [
      'depositReturnDays',
      'depositClaimNoticeDays',
      'entryNoticeHours',
      'earlyTerminationFeeUsd',
      'earlyTerminationNoticeDays',
    ];

    for (const name of constrained) {
      const field = allFields(FL_INTERVIEW).find((f) => f.name === name);

      expect(field, `${name} is not asked at all`).toBeDefined();
      expect(field?.statute?.cite, `${name} has no statutory citation shown`).toMatch(/Fla\. Stat\./);
    }
  });

  it('never phrases help text as advice', () => {
    // The same UPL line the rule pack holds. State the requirement and what
    // the answer does; do not recommend.
    const banned = ['you should', 'we recommend', 'we suggest', 'is unenforceable', 'is illegal'];

    for (const field of allFields(FL_INTERVIEW)) {
      const text = `${field.label} ${field.help ?? ''} ${field.statute?.note ?? ''}`.toLowerCase();

      for (const phrase of banned) {
        expect(text.includes(phrase), `${field.name}: "${phrase}"`).toBe(false);
      }
    }
  });
});

describe('progressive disclosure', () => {
  it('hides the pet step when pets are not permitted', () => {
    const shown = visibleSteps(FL_INTERVIEW, answers({ facts: { ...PICANA_FACTS, petsPermitted: false } }));

    expect(shown.map((s) => s.id)).not.toContain('pets');
  });

  it('shows it when they are', () => {
    expect(visibleSteps(FL_INTERVIEW, answers()).map((s) => s.id)).toContain('pets');
  });

  it('hides the pool question on a property without a pool', () => {
    const shown = visibleSteps(FL_INTERVIEW, answers({ facts: { ...PICANA_FACTS, hasPool: false } }));
    const fields = shown.flatMap((s) =>
      s.fields.filter((f) => f.showWhen?.(answers({ facts: { ...PICANA_FACTS, hasPool: false } })) !== false),
    );

    expect(fields.some((f) => f.name === 'hasPool')).toBe(true);
  });

  it('never asks the same number twice', () => {
    // ClauseFacts and MoneyAnswers overlap by design inside the engine. Letting
    // that leak into the interview produced a deposit step that asked "how much
    // was carried in?" and then "confirm the amount carried in".
    const names = allFields(FL_INTERVIEW).map((f) => f.name);
    const duplicated = names.filter((n, i) => names.indexOf(n) !== i);

    expect(duplicated).toEqual([]);

    for (const field of allFields(FL_INTERVIEW)) {
      expect(field.label.toLowerCase(), `${field.name} asks for confirmation`).not.toContain('confirm');
    }
  });

  it('hides the second-tier late fee unless the tiered policy is chosen', () => {
    const flat = answers({ facts: { ...PICANA_FACTS, lateFeePolicy: 'flat' } });
    const field = allFields(FL_INTERVIEW).find((f) => f.name === 'secondTierFeeUsd');

    expect(field?.showWhen?.(flat)).toBe(false);
    expect(field?.showWhen?.(answers())).toBe(true);
  });

  it('always shows the flood disclosure step — the statute does not make it optional', () => {
    for (const f of [PICANA_FACTS, { ...PICANA_FACTS, hasPool: false, petsPermitted: false }]) {
      expect(visibleSteps(FL_INTERVIEW, answers({ facts: f })).map((s) => s.id)).toContain('disclosures');
    }
  });
});

describe('structure', () => {
  it('gives every step a unique id and a title', () => {
    const ids = FL_INTERVIEW.map((s) => s.id);

    expect(new Set(ids).size).toBe(ids.length);

    for (const step of FL_INTERVIEW) {
      expect(step.title.length).toBeGreaterThan(0);
    }
  });

  it('offers only sections the engine knows for custom clauses', () => {
    const step = FL_INTERVIEW.find((s) => s.id === 'custom-clauses');

    expect(step, 'There is no custom-clause step — the Zillow failure, reproduced.').toBeDefined();

    for (const section of step?.customClauseSections ?? []) {
      expect(FL_SECTION_ORDER).toContain(section);
    }
  });

  it('ends on review', () => {
    expect(FL_INTERVIEW.at(-1)?.id).toBe('review');
  });
});
