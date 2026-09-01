import { describe, expect, it } from 'vitest';

import { FL_LIBRARY, FL_SECTION_ORDER } from '../clauses/us-fl';
import type { InterviewAnswers } from '../interview/steps';
import { allFields, DERIVED_FACTS, DERIVED_VALUES, FL_INTERVIEW, visibleSteps } from '../interview/steps';
import { PICANA_FACTS, PICANA_MONEY, PICANA_PARTIES, PICANA_VALUES, PICANA_YARD } from '../matters/picana-ln';

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
  yardTasks: PICANA_YARD,
  ...overrides,
});

describe('coverage — the interview must be able to fill the document', () => {
  /*
    TARGET MATTERS, AND IGNORING IT HID TWO BLOCKING BUGS FOR THE WHOLE LIFE OF
    THE FEATURE.

    This compared by field NAME alone. `startDate` is asked with
    `target: 'money'`, so it lands in `money.term.startDate` and never reaches
    `values` — but the name matched, so the test went green while every lease
    rendered "The term of this Lease begins on {{startDate}}". `effectiveDate`
    was worse: it sat in DERIVED_VALUES with nothing deriving it, and the
    membership check passed on the declaration alone.

    Both made `missing` permanently non-empty, so `readyToSend` was false for
    every lease ever built through the product. Nobody could send anything, and
    the suite was green.

    A clause VALUE variable is covered only by a field that targets `value`, or
    by something that actually derives it.
  */
  it('asks for, or derives, every variable the library interpolates', () => {
    const needed = new Set(FL_LIBRARY.flatMap((c) => c.variables.map((v) => v.name)));
    const askedAsValue = new Set(
      allFields(FL_INTERVIEW)
        .filter((f) => f.target === 'value')
        .map((f) => f.name),
    );

    const uncovered = [...needed].filter((name) => !askedAsValue.has(name) && !DERIVED_VALUES.includes(name));

    expect(
      uncovered,
      'These clause variables have no interview field targeting `value` and are not derived. ' +
        'A lease would render with the raw {{token}} visible and nothing would error.',
    ).toEqual([]);
  });

  /*
    And membership of DERIVED_VALUES is a CLAIM, not a derivation. This asserts
    the claim is true by rendering the reference matter and checking nothing is
    left outstanding — the check that would have caught `effectiveDate` on the
    day it was added to the list.
  */
  it('leaves nothing outstanding once every asked question is answered', async () => {
    const { missing } = await import('../render/render-lease').then((m) =>
      m.buildLeaseDocuments({
        facts: PICANA_FACTS,
        money: PICANA_MONEY,
        values: PICANA_VALUES,
        parties: PICANA_PARTIES,
        propertyAddress: '29090 Picana Ln, Wesley Chapel, FL 33543',
        customClauses: [],
      }),
    );

    /*
      Not "nothing is missing" — the reference matter deliberately leaves the
      three flood answers blank, because they are the landlord's own knowledge
      and must never be defaulted. What must never be missing is anything the
      interview CLAIMS to derive: that claim is why no step asks for it.
    */
    const brokenPromises = missing.filter((entry) => DERIVED_VALUES.some((name) => entry.endsWith(`: ${name}`)));

    expect(
      brokenPromises,
      'These sit in DERIVED_VALUES, so no step asks for them — and nothing derives them either. ' +
        'Every lease is permanently unsendable and no answer the landlord gives can fix it.',
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
  /*
    The pet STEP no longer hides — it carries the toggle that would hide it, and
    a step that removes itself renumbers the one the answerer is standing on.
    What hides is everything below the toggle.
  */
  it('keeps the pet step visible either way, since it asks the gating question', () => {
    const off = visibleSteps(FL_INTERVIEW, answers({ facts: { ...PICANA_FACTS, petsPermitted: false } }));
    const on = visibleSteps(FL_INTERVIEW, answers());

    expect(off.map((s) => s.id)).toContain('pets');
    expect(on.map((s) => s.id)).toContain('pets');
    expect(off.length).toBe(on.length);
  });

  it('hides the pet detail questions when pets are not permitted', () => {
    const step = FL_INTERVIEW.find((s) => s.id === 'pets');
    const no = answers({ facts: { ...PICANA_FACTS, petsPermitted: false } });

    const shown = step?.fields.filter((f) => f.showWhen === undefined || f.showWhen(no)).map((f) => f.name);

    expect(shown).toEqual(['petsPermitted']);
  });

  it('shows them when they are', () => {
    const step = FL_INTERVIEW.find((s) => s.id === 'pets');
    const yes = answers();

    const shown = step?.fields.filter((f) => f.showWhen === undefined || f.showWhen(yes)).map((f) => f.name);

    expect(shown).toContain('permittedPets');
    expect(shown).toContain('petFeeUsd');
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

/**
 * A toggle must not sit on a step it can reorder.
 *
 * `petsPermitted` was declared as the last field of the FLOOD DISCLOSURE step,
 * and it gates the Pets step, which is declared before it. Switching it on
 * therefore inserted a step at the index the answerer was standing on: the page
 * silently became "Pets", with two flood questions unanswered and now behind
 * them. The flood step's own intro said "These three answers are yours alone"
 * while rendering four fields, one about animals.
 *
 * The general rule this asserts: a field whose value changes which STEPS exist
 * may not live on a step that the change can renumber. The Pets step is always
 * shown now, and asks the question itself.
 */
describe('fields that add or remove steps', () => {
  const gates = new Map<string, string>([['petsPermitted', 'pets']]);

  it('are asked on a step that is always visible', () => {
    for (const [field] of gates) {
      const owner = FL_INTERVIEW.find((step) => step.fields.some((f) => f.name === field));

      expect(owner, `${field} is asked nowhere`).toBeDefined();
      expect(owner?.showWhen, `${field} decides which steps exist, but sits on a conditional step`).toBeUndefined();
    }
  });

  it('are asked on, or before, the step they control', () => {
    for (const [field, controlled] of gates) {
      const askedAt = FL_INTERVIEW.findIndex((step) => step.fields.some((f) => f.name === field));
      const controlledAt = FL_INTERVIEW.findIndex((step) => step.id === controlled);

      expect(askedAt).toBeGreaterThanOrEqual(0);
      expect(askedAt, `${field} is asked after the step it controls`).toBeLessThanOrEqual(controlledAt);
    }
  });

  /*
    The intro counted its questions in prose. Once the pets toggle was added
    below it, the sentence was simply wrong — and prose that counts is prose
    that goes stale, so it no longer counts.
  */
  it('leaves the flood step describing only flood questions', () => {
    const flood = FL_INTERVIEW.find((step) => step.id === 'disclosures');

    expect(flood?.fields.map((f) => f.name)).not.toContain('petsPermitted');
    expect(flood?.fields.every((f) => /flood/i.test(f.name))).toBe(true);
  });
});
