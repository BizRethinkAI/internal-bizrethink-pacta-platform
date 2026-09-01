import { describe, expect, it } from 'vitest';

import { describeMissing, describeMissingUnique } from '../interview/describe-missing';

/**
 * The review panel spoke the renderer's language, not the landlord's.
 *
 * `missing` is `"clause.slug: variableName"`, and it was printed verbatim in
 * monospace under "10 answers still outstanding". A landlord reading
 * `rent.late-fee-flat: graceDays` cannot tell which question they skipped or
 * which step it is on — and in the case of `parties.recital: effectiveDate`
 * there was no question at all, so the honest answer was that no amount of
 * answering would clear it.
 */

describe('describeMissing', () => {
  it('gives the question and the step it is asked on', () => {
    const [entry] = describeMissing(['rent.late-fee-flat: graceDays']);

    expect(entry.question).toBe('How many days after the due date before rent is late?');
    expect(entry.stepTitle).toBe('Late payment and charges');
    expect(entry.stepId).toBe('fees');
  });

  it('keeps the raw form, so a bug report can still name the clause', () => {
    expect(describeMissing(['rent.late-fee-flat: graceDays'])[0].raw).toBe('rent.late-fee-flat: graceDays');
  });

  /*
    The case that mattered. A variable nothing asks for is a defect in the
    builder, not a gap in the answers, and telling someone to "go and answer
    it" sends them looking for a question that does not exist.
  */
  it('says so plainly when no question asks for the variable', () => {
    const [entry] = describeMissing(['some.clause: aVariableNobodyAsksFor']);

    expect(entry.stepTitle).toBeNull();
    expect(entry.question).toContain('no question asks for this');
    expect(entry.question).toContain('aVariableNobodyAsksFor');
  });

  it('handles a bare variable name without a slug', () => {
    expect(describeMissing(['graceDays'])[0].stepId).toBe('fees');
  });

  it('collapses one variable required by several clauses into one line', () => {
    const entries = describeMissingUnique(['fees.administrative: lockoutFeeUsd', 'another.clause: lockoutFeeUsd']);

    expect(entries).toHaveLength(1);
  });
});

/**
 * A question put to the TENANT is not a question the landlord skipped.
 *
 * Ticking "ask the tenant" on a field does not fill it — it records that the
 * tenant will. But the outstanding list is built from the renderer's `missing`,
 * which only knows the variable is unfilled, so a delegated field appeared
 * alongside the landlord's own unanswered questions with nothing to tell them
 * apart. The landlord sees "Which animals are permitted?" in a red blocking
 * list, goes to answer it, and finds they have already dealt with it.
 *
 * It still BLOCKS — a lease cannot go out with a raw token in it — but blocking
 * and being someone's fault are different things, and the panel has to say
 * which.
 */
describe('delegated questions', () => {
  const missing = ['pets.addendum: permittedPets', 'fees.administrative: lockoutFeeUsd'];

  it('are marked as waiting on the tenant', () => {
    const [pets] = describeMissingUnique(missing, ['permittedPets']);

    expect(pets.awaitingTenant).toBe(true);
    expect(pets.question).toContain('animals');
  });

  it('leave the landlord’s own questions alone', () => {
    const [, lockout] = describeMissingUnique(missing, ['permittedPets']);

    expect(lockout.awaitingTenant).toBe(false);
  });

  it('treat nothing as delegated when no list is given', () => {
    expect(describeMissingUnique(missing).every((entry) => entry.awaitingTenant === false)).toBe(true);
  });

  /*
    A field the landlord answered anyway is no longer waiting on anybody. The
    delegation list is a record of who was ASKED, not of what is outstanding.
  */
  it('are still reported, since a delegated answer that never arrives blocks the send', () => {
    expect(describeMissingUnique(missing, ['permittedPets'])).toHaveLength(2);
  });
});
