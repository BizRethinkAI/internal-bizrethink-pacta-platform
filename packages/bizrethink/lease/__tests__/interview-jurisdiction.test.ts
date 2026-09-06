import { describe, expect, it } from 'vitest';

/*
  Every clause, whatever its jurisdiction. `FL_LIBRARY` is that set today — the
  name is a leftover from when the library was assumed to be Florida's, and #93
  renames the concept to ALL_CLAUSES. Swap the import when that lands.
*/
import { FL_LIBRARY as ALL_CLAUSES } from '../clauses/us-fl';
import { allFields, FL_INTERVIEW, interviewFor } from '../interview/steps';

/**
 * Which questions belong to which jurisdiction.
 *
 * Splitting the CLAUSES was the easy half. The interview is the half that
 * decides whether a second state is possible at all: Florida asks the tenant to
 * elect under §83.595(4), and North Carolina has no such provision — so the
 * question must not appear, because an answer would render a clause with no
 * statutory basis behind it.
 *
 * THE MARKING IS DERIVED, NOT PINNED. A field is Florida-only exactly when every
 * clause that consumes it is Florida. That relationship is already in the
 * library, so this test computes the expectation from the clauses rather than
 * from a list somebody has to remember to update. Add a North Carolina clause
 * that uses `depositReturnDays` and the field stops being Florida-only, and the
 * test says so.
 *
 * Measured today: 23 fields feed only Florida clauses, 24 feed clauses that
 * travel, and 19 are not clause variables at all — they are facts and money
 * that shape which clauses get selected.
 */

/** Jurisdictions of every clause that consumes a given field. */
const consumersOf = (): Map<string, Set<string>> => {
  const byVariable = new Map<string, Set<string>>();

  for (const clause of ALL_CLAUSES) {
    for (const variable of clause.variables) {
      const seen = byVariable.get(variable.name) ?? new Set<string>();

      seen.add(clause.jurisdiction);
      byVariable.set(variable.name, seen);
    }
  }

  return byVariable;
};

describe('the interview knows whose law each question serves', () => {
  it('marks a field for one jurisdiction exactly when only that jurisdiction uses it', () => {
    const consumers = consumersOf();
    const wrong: string[] = [];

    for (const field of allFields(FL_INTERVIEW)) {
      const used = consumers.get(field.name);

      // Not a clause variable — a fact or a money answer. Those shape which
      // clauses are selected rather than filling one in, and are never marked.
      if (used === undefined) {
        if (field.jurisdictions !== undefined) {
          wrong.push(`${field.name}: marked, but no clause uses it`);
        }
        continue;
      }

      const stateOnly = used.size === 1 && !used.has('generic') && !used.has('US');
      const expected = stateOnly ? [...used][0] : undefined;
      const actual = field.jurisdictions?.length === 1 ? field.jurisdictions[0] : undefined;

      if (expected !== actual) {
        wrong.push(`${field.name}: used by ${[...used].join('+')}, marked ${actual ?? 'shared'}`);
      }
    }

    expect(wrong).toEqual([]);
  });

  it('counts out the same way it was measured', () => {
    const marked = allFields(FL_INTERVIEW).filter((f) => f.jurisdictions !== undefined);

    /*
      25 since the CDD pair (cddName, cddAssessmentsPaidBy) landed. NOT
      assessmentsPaidBy — that feeds hoa.compliance, which is `generic`, so the
      question travels to any state. The derived test above is what proves that
      distinction rather than this count.
    */
    expect(marked.length).toBe(25);
  });
});

describe('interviewFor', () => {
  it('asks Florida everything it asks today', () => {
    expect(allFields(interviewFor('US-FL')).map((f) => f.name)).toEqual(allFields(FL_INTERVIEW).map((f) => f.name));
  });

  /*
    The guarantee. §83.595(4) is a Florida election; asking a North Carolina
    landlord for it would produce an answer with no clause to land in.
  */
  it('asks North Carolina nothing that only Florida law supports', () => {
    const asked = allFields(interviewFor('US-NC')).map((f) => f.name);

    for (const florida of ['earlyTerminationFeeUsd', 'depositReturnDays', 'entryNoticeHours']) {
      expect(asked, florida).not.toContain(florida);
    }
  });

  it('still asks North Carolina everything that travels', () => {
    const asked = allFields(interviewFor('US-NC')).map((f) => f.name);

    for (const shared of ['startDate', 'endDate', 'permittedPets', 'occupantLimit']) {
      expect(asked, shared).toContain(shared);
    }
  });

  /*
    A step whose every question was Florida-only must disappear, not render as
    an empty page with a heading and nothing to answer.
  */
  it('drops a step left with no questions', () => {
    for (const step of interviewFor('US-NC')) {
      const isNarrative = FL_INTERVIEW.find((s) => s.id === step.id)?.fields.length === 0;

      expect(step.fields.length > 0 || isNarrative, step.id).toBe(true);
    }
  });
});
