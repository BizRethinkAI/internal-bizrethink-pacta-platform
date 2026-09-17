import type { McaJurisdiction } from '../jurisdictions';
import { CT_VA_OBLIGATIONS, type StatutoryObligation } from './ct-va-obligations';

/**
 * What a state requires of a funder who wants to operate there.
 *
 * ADR 0025 decision 2. This vertical is custodian of the changing landscape
 * around merchant cash advance, and a registration duty is part of that
 * landscape even though it appears in no document the builder produces. Until
 * now the library held these obligations and had no way to show them to the
 * entity they bind.
 *
 * QUOTED, NEVER ADVISED — the discipline the disclosures already run under
 * (ADR 0008). Verbatim from a vendored source, cited to section, re-matched
 * against the statute's own bytes on every run, and **verified, never
 * approved**. It reports what the statute says. It does not say what anybody
 * must do, and it refuses nothing: where a funder operates is the entity's
 * decision, made by the entity.
 */
export type OperatingRequirement = StatutoryObligation;

const REGISTRATION = CT_VA_OBLIGATIONS.filter((obligation) => obligation.bearsOn === 'registration');

/**
 * Which states the library can answer for at all.
 *
 * Derived from the obligations themselves rather than listed, so extending
 * coverage cannot leave a stale list behind claiming a state is uncovered when
 * its text has been vendored.
 */
const COVERED = new Set<McaJurisdiction>(REGISTRATION.map((obligation) => obligation.jurisdiction));

/**
 * The registration duties bearing on a programme's declared states.
 *
 * Ordered by the library's own order rather than the caller's, so two callers
 * asking about the same states get the same answer in the same sequence and a
 * diff between two reports means something.
 */
export const operatingRequirementsFor = (states: readonly McaJurisdiction[]): OperatingRequirement[] => {
  const asked = new Set(states);

  return REGISTRATION.filter((obligation) => asked.has(obligation.jurisdiction));
};

/**
 * THE SILENCE IS THE DANGEROUS PART.
 *
 * An empty result could mean "this state asks nothing of you" or "we have not
 * looked", and those are opposite facts with opposite consequences. The library
 * holds registration text for two states of eleven, so for the rest it has to
 * say so out loud rather than return nothing and leave the reader to infer the
 * comfortable reading.
 *
 * This is the same instinct as `StatutoryObligation.satisfiedBy` being nullable
 * — in that file's words, the nulls are the useful half.
 */
export const statesWithoutAnOperatingRecord = (states: readonly McaJurisdiction[]): McaJurisdiction[] =>
  [...new Set(states)].filter((state) => !COVERED.has(state));
