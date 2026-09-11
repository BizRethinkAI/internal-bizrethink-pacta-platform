import { describe, expect, it } from 'vitest';

import { ALL_CLAUSES } from '../clauses/library';
import { allFields, FL_INTERVIEW, interviewFor } from '../interview/steps';

/**
 * WHAT A NORTH CAROLINA LANDLORD IS STILL SHOWN THAT IS FLORIDA'S.
 *
 * This test does not fix anything. It MEASURES something, and pins the
 * measurement so it can only shrink.
 *
 * `interview-jurisdiction.test.ts` derives a field's jurisdiction from the
 * library: a question is one state's exactly when every clause consuming it is
 * that state's. That rule is correct, self-maintaining, and covers only clause
 * VARIABLES — the answers that get interpolated into text. It cannot cover:
 *
 *   FACT AND MONEY FIELDS. These do not fill a clause in, they decide which
 *   clauses are SELECTED, so no clause lists them as a variable and the derived
 *   rule sees nothing. The rule actively FORBIDS marking one, because a marking
 *   it cannot verify is a marking that can go stale. So a question that gates a
 *   Florida-only clause is asked in North Carolina, where answering it changes
 *   nothing at all.
 *
 *   TEACHING TEXT. `help`, `statute` and a step's `intro` are prose on a field
 *   that may legitimately be shared, and an `InterviewField` holds exactly one
 *   `statute` note. So a shared question carries one state's citation to both.
 *
 * THIS IS THE HONEST ANSWER TO "WAS A SECOND STATE CHEAP". The clause library
 * was: 17 new clauses, 0 of the 36 portable ones duplicated. The interview was
 * not, and this file is the receipt.
 *
 * The right fix is a design change — per-jurisdiction teaching on a field, and
 * a marking mechanism that can see `includeWhen` — and it is deliberately not
 * in this PR. Deriving fact markings from `includeWhen` source text was tried
 * and rejected: it would have marked `propertyType` as Florida-only and removed
 * a required question from North Carolina's interview, because every clause
 * currently branching on the property type happens to be Florida's.
 */

/** Clauses whose `includeWhen` source mentions this fact by name. */
const gatedBy = (field: string) =>
  ALL_CLAUSES.filter((clause) => clause.includeWhen !== null && clause.includeWhen.toString().includes(`.${field}`));

const asked = (jurisdiction: 'US-FL' | 'US-NC') => allFields(interviewFor(jurisdiction));

describe('questions North Carolina is asked that only Florida can use', () => {
  /*
    A question is DEAD in North Carolina when every clause it gates belongs to
    Florida: the landlord answers it, and no clause anywhere in their library
    changes. Two of them additionally display a Florida citation.

    PINNED, so the list can shrink but never grow unnoticed. A new fact field
    gating a Florida-only clause lands here or the test fails.
  */
  it('is exactly these five, and no more', () => {
    const dead = asked('US-NC')
      .filter((field) => field.target !== 'value')
      .filter((field) => {
        const gates = gatedBy(field.name);

        return gates.length > 0 && gates.every((clause) => clause.jurisdiction === 'US-FL');
      })
      .map((field) => field.name)
      .sort();

    expect(dead).toEqual([
      // Fla. Stat. §83.595(4) — gates `termination.early-election`. Shows a
      // Florida citation, and offers a remedy North Carolina does not have.
      'earlyTerminationOffered',
      // Fla. Stat. §83.505 — gates `notices.electronic-delivery`. Shows a
      // Florida citation. North Carolina needs no addendum for e-mail notice,
      // and `notices.method-nc` simply permits it.
      'electronicNoticesElected',
      // Ch. 190 Fla. Stat. — gates `cdd.assessments`. A community development
      // district is a Florida creature.
      'hasCdd',
      // Fla. Stat. §83.49(2) — gates `deposit.escrow-notice`. The subsection
      // exempts a landlord renting fewer than five units; North Carolina has
      // no equivalent threshold, because §42-50 puts every deposit in a trust
      // account whatever the size of the portfolio. Asked there, dead there.
      'landlordRentsFiveOrMoreUnits',
      // Fla. Stat. §83.575 — gates `term.non-renewal-notice`. Shows a Florida
      // citation. Its follow-up `nonRenewalNoticeDays` IS correctly marked,
      // because that one is a clause variable — which is exactly the gap.
      'nonRenewalNoticeRequired',
    ]);
  });

  /*
    And the citations themselves. A field that is asked in North Carolina and
    quotes a Florida statute at the landlord is the most visible half of the
    leak, and the one a user would report as a bug.

    `propertyYearBuilt` is not here and must never be: it cites 42 U.S.C.
    §4852d, which is federal and true in every state.
  */
  it('quotes Florida law to a North Carolina landlord in exactly these places', () => {
    const quoting = asked('US-NC')
      .filter((field) => /Fla\. Stat\.|Florida/.test(`${field.statute?.cite ?? ''} ${field.statute?.note ?? ''}`))
      .map((field) => field.name)
      .sort();

    expect(quoting).toEqual([
      'earlyTerminationOffered',
      'electronicNoticesElected',
      'nonRenewalNoticeRequired',
      // A shared, REQUIRED question. It cites §83.51(2) because that is the
      // statute that makes the property type load-bearing — in Florida. In
      // North Carolina §42-42(b) makes the property type irrelevant to what a
      // lease may shift, and the question is still asked because the answer
      // feeds `propertyTypeLabel` and the property record.
      'propertyType',
    ]);
  });

  /*
    Step prose. `intro` belongs to the step, not the field, so no marking
    mechanism reaches it at all — a step survives into North Carolina if any of
    its questions do, and brings Florida's framing with it.
  */
  it('frames these steps as Florida’s for both states', () => {
    const ncSteps = new Set(interviewFor('US-NC').map((step) => step.id));

    const florida = FL_INTERVIEW.filter((step) => ncSteps.has(step.id))
      .filter((step) => /Florida/.test(step.intro ?? ''))
      .map((step) => step.id)
      .sort();

    /*
      Not `maintenance`: both of its questions are the Florida repair
      threshold, so `interviewFor` drops the whole step for North Carolina —
      which is the mechanism working, and the reason its Florida-framed intro
      never reaches a North Carolina landlord.
    */
    expect(florida).toEqual(['property', 'review']);
  });
});

describe('what the split does get right', () => {
  /*
    The counterweight, so the file above is read as a bounded gap rather than a
    broken feature. Every question that fills a clause IN is correctly scoped,
    and that is the majority of the interview.
  */
  it('asks North Carolina no Florida clause variable, and Florida no North Carolina one', () => {
    /*
      EVERY consumer, not just the state's own. `hoaNoticeHours` is used by
      `cdd.assessments`, which is Florida's, AND by `hoa.compliance`, which is
      generic — so it is shared and belongs in both interviews. The first
      version of this test asked "is it used by a Florida clause and not by a
      North Carolina one", which reported it as a leak. Same trap the derived
      marking avoids by asking whether EVERY consumer is one state's.
    */
    const onlyUsedBy = (jurisdiction: 'US-FL' | 'US-NC') => {
      const names = new Set<string>();

      for (const clause of ALL_CLAUSES) {
        for (const variable of clause.variables) {
          names.add(variable.name);
        }
      }

      return [...names].filter((name) => {
        const consumers = ALL_CLAUSES.filter((clause) => clause.variables.some((v) => v.name === name));

        return consumers.length > 0 && consumers.every((clause) => clause.jurisdiction === jurisdiction);
      });
    };

    const askedInNc = new Set(asked('US-NC').map((field) => field.name));
    const askedInFl = new Set(asked('US-FL').map((field) => field.name));

    expect(onlyUsedBy('US-FL').filter((name) => askedInNc.has(name))).toEqual([]);
    expect(onlyUsedBy('US-NC').filter((name) => askedInFl.has(name))).toEqual([]);
  });

  /*
    And North Carolina asks FEWER questions than Florida, which is the shape a
    correct filter produces. §42-52 fixes both deposit deadlines, so North
    Carolina never asks how many days the landlord will take; Florida must,
    because §83.49(3)(a) sets a maximum and anything under it is a choice.
  */
  it('leaves North Carolina a shorter interview than Florida', () => {
    expect(asked('US-NC').length).toBeLessThan(asked('US-FL').length);

    const askedInNc = new Set(asked('US-NC').map((field) => field.name));

    expect(askedInNc.has('depositReturnDays')).toBe(false);
    expect(askedInNc.has('depositClaimNoticeDays')).toBe(false);
  });
});
