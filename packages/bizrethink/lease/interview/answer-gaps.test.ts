import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { PICANA_FACTS, PICANA_MONEY, PICANA_VALUES } from '../matters/picana-ln';
import { ignoredAnswers, unansweredRequired } from './answer-gaps';
import type { InterviewAnswers } from './steps';
import { allFields, FL_INTERVIEW, interviewFor } from './steps';

const FL = interviewFor('US-FL');

/**
 * 2026-09-15, the pilot lease. The tenant was asked who else would live there
 * and answered with three names. The lease named only the two tenants.
 *
 * "Is anyone else going to live there?" was added to the interview after that
 * lease was started, so it was never answered — and an unanswered yes/no reads
 * as "no", which selects the clause without the names. Nothing blocked, nothing
 * warned: the question only drives clause SELECTION, and the send gate only
 * counted unfilled clause VARIABLES. The tenant's answer sat in the database,
 * unused, while the review step said the lease was ready.
 */

const answers = (overrides: { facts?: object; values?: object } = {}): InterviewAnswers => ({
  facts: { ...PICANA_FACTS, ...overrides.facts } as InterviewAnswers['facts'],
  money: PICANA_MONEY,
  values: { ...PICANA_VALUES, ...overrides.values } as InterviewAnswers['values'],
  customClauses: [],
  yardTasks: [],
});

const withoutOccupantsAnswer = () => {
  const { hasNamedOccupants: _never, ...facts } = PICANA_FACTS as InterviewAnswers['facts'] & {
    hasNamedOccupants?: boolean;
  };

  return { ...answers(), facts: facts as InterviewAnswers['facts'] };
};

describe('unansweredRequired', () => {
  it('asks whether anyone else lives there, and treats no answer as no answer — not as "no"', () => {
    expect(allFields(FL).find((field) => field.name === 'hasNamedOccupants')?.required).toBe(true);

    expect(unansweredRequired(withoutOccupantsAnswer(), FL)).toContain('hasNamedOccupants');
    expect(unansweredRequired(answers({ facts: { hasNamedOccupants: false } }), FL)).not.toContain('hasNamedOccupants');
    expect(unansweredRequired(answers({ facts: { hasNamedOccupants: true } }), FL)).not.toContain('hasNamedOccupants');
  });

  it('does not ask a question that is not being shown', () => {
    const blank = { poolServicePaidBy: '' };

    expect(unansweredRequired(answers({ facts: { hasPool: false }, values: blank }), FL)).not.toContain(
      'poolServicePaidBy',
    );
    expect(unansweredRequired(answers({ facts: { hasPool: true }, values: blank }), FL)).toContain('poolServicePaidBy');
  });

  it("does not ask another state's questions", () => {
    const northCarolinaOnly = allFields(FL_INTERVIEW)
      .map((field) => field.name)
      .filter((name) => !allFields(FL).some((field) => field.name === name));

    expect(northCarolinaOnly.length).toBeGreaterThan(0);

    for (const name of unansweredRequired(answers(), FL)) {
      expect(northCarolinaOnly).not.toContain(name);
    }
  });

  it('does not ask anything on a step that is not being shown', () => {
    const hoaStep = FL_INTERVIEW.find((step) => step.id === 'governing-documents');
    const required = (hoaStep?.fields ?? []).filter((field) => field.required).map((field) => field.name);

    for (const name of required) {
      expect(unansweredRequired(answers({ facts: { hasHoa: false }, values: { [name]: '' } }), FL)).not.toContain(name);
    }
  });
});

describe('ignoredAnswers', () => {
  it('reports an answer the lease will not use, and where to look', () => {
    const ignored = ignoredAnswers(
      answers({ facts: { hasNamedOccupants: false }, values: { authorisedOccupants: 'A. Tenant, B. Tenant' } }),
      FL,
    );

    expect(ignored).toEqual([expect.objectContaining({ raw: 'authorisedOccupants', stepTitle: 'Who is renting it' })]);
  });

  it('says nothing when the answer is used, or when there is no answer', () => {
    expect(
      ignoredAnswers(answers({ facts: { hasNamedOccupants: true }, values: { authorisedOccupants: 'A. Tenant' } }), FL),
    ).toEqual([]);
    expect(
      ignoredAnswers(answers({ facts: { hasNamedOccupants: false }, values: { authorisedOccupants: '  ' } }), FL),
    ).toEqual([]);
  });

  // A number behind a "no" is as often a seeded default as an answer.
  it('does not report a stored number or "no" as an ignored answer', () => {
    const ignored = ignoredAnswers(
      answers({ facts: { terminationOnSale: false }, values: { saleNoticeDays: 60 } }),
      FL,
    );

    expect(ignored.map((entry) => entry.raw)).not.toContain('saleNoticeDays');
  });
});

/**
 * The gates. `validate` is advisory and `prepare` is the only thing between a
 * draft and an envelope, so both must count these — source-level, because the
 * router needs a database.
 */
describe('the lease builder counts unanswered questions', () => {
  const router = readFileSync(new URL('../../server-only/trpc/lease-builder-router.ts', import.meta.url), 'utf8');

  const helper = router.slice(router.indexOf('const interviewGaps = '), router.indexOf('The statutory rule pack'));

  it('asks under the property state and runs both checks', () => {
    expect(helper).toContain('interviewFor(jurisdictionForProperty(');
    expect(helper).toContain('unansweredRequired(');
    expect(helper).toContain('ignoredAnswers(');
  });

  it('blocks preparing an envelope on them', () => {
    const prepare = router.slice(router.indexOf('prepare: authenticatedProcedure'));

    expect(prepare.indexOf('interviewGaps(')).toBeGreaterThan(-1);
    expect(prepare.indexOf('interviewGaps(')).toBeLessThan(prepare.indexOf('await prepareEnvelopeFromMatter('));
  });

  it('reports both on the review step', () => {
    const validate = router.slice(
      router.indexOf('validate: authenticatedProcedure'),
      router.indexOf('prepare: authenticatedProcedure'),
    );

    expect(validate).toContain('interviewGaps(');
    expect(validate).toContain('ignoredAnswers: gaps.ignored');
  });
});
