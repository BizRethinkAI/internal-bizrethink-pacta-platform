import { describe, expect, it } from 'vitest';

/*
  Every clause, whatever its jurisdiction — and now genuinely so. This read the
  Florida module's export under an alias while Florida was the only state with
  clauses; with North Carolina's seventeen in the library that alias would have
  computed the whole marking from one state and quietly agreed with itself.
*/
import { ALL_CLAUSES } from '../clauses/library';
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
    const by = (jurisdiction: string) => marked.filter((f) => f.jurisdictions?.includes(jurisdiction as never)).length;

    /*
      Was 25 when Florida was the only state with clauses. Two things moved it,
      and both are worth reading rather than just recounting:

        -2  `venueCounty` and `advanceRentUsd` stopped being Florida-only,
            because North Carolina clauses now consume them. Neither was
            decided here — the derived test above computed it from the library
            and failed until the markings came off.

        +7  North Carolina's own questions. Four of the seven duplicate a
            Florida question that could have been shared, and are separate only
            because an `InterviewField` holds one `statute` note and the two
            states cite different law. That is the measurable cost of a second
            state in this file, and it is reported in the PR rather than hidden
            in a count.
    */
    expect({ total: marked.length, florida: by('US-FL'), northCarolina: by('US-NC') }).toEqual({
      total: 30,
      florida: 23,
      northCarolina: 7,
    });
  });
});

describe('interviewFor', () => {
  /*
    `FL_INTERVIEW` IS THE MASTER LIST, NOT FLORIDA'S — a name that was accurate
    until North Carolina had questions of its own and is now the same kind of
    leftover as `us-fl` holding the generic clauses.

    So this can no longer assert that Florida is asked everything in the master
    list. What it asserts instead is the property that actually matters: Florida
    is asked the master list MINUS the questions belonging to another state, and
    nothing has gone missing from it.
  */
  it('asks Florida every question that is not another state’s', () => {
    const expected = allFields(FL_INTERVIEW)
      .filter((f) => f.jurisdictions === undefined || f.jurisdictions.includes('US-FL'))
      .map((f) => f.name);

    expect(allFields(interviewFor('US-FL')).map((f) => f.name)).toEqual(expected);
  });

  it('asks North Carolina its own questions', () => {
    const asked = allFields(interviewFor('US-NC')).map((f) => f.name);

    for (const field of [
      'ncDepositSecurity',
      'ncDepositInstitution',
      'ncDepositInstitutionAddress',
      'ncEntryNoticeHours',
      'ncCureDays',
      'ncNoticeName',
      'ncNoticeAddress',
    ]) {
      expect(asked, field).toContain(field);
    }
  });

  /*
    And Florida is asked none of them. The filter runs both ways or it is not a
    filter.
  */
  it('asks Florida none of North Carolina’s', () => {
    const asked = allFields(interviewFor('US-FL')).map((f) => f.name);

    expect(asked.filter((name) => name.startsWith('nc'))).toEqual([]);
  });

  /*
    The two fields that stopped being Florida-only when North Carolina clauses
    began consuming them. Pinned by name because the derived test above reports
    a mismatch, not a direction, and it took reading the failure to see which
    way it had moved.
  */
  it('asks both states the questions their clauses now share', () => {
    for (const jurisdiction of ['US-FL', 'US-NC'] as const) {
      const asked = allFields(interviewFor(jurisdiction)).map((f) => f.name);

      expect(asked, `${jurisdiction} venueCounty`).toContain('venueCounty');
      expect(asked, `${jurisdiction} advanceRentUsd`).toContain('advanceRentUsd');
    }
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
