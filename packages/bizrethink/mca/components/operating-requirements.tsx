import { Trans } from '@lingui/react/macro';
import { JURISDICTION_NAMES, type McaJurisdiction } from '../jurisdictions';
import { operatingRequirementsFor, statesWithoutAnOperatingRecord } from '../statutes/operating-requirements';

/**
 * What the states in this programme require of the funder itself.
 *
 * ADR 0025 decision 2. These duties bind the entity rather than appearing in any
 * document the builder produces, and until now the library held them with no way
 * to show them to the entity they bind.
 *
 * QUOTED, NEVER ADVISED. Every line is the statute's own words, cited to
 * section, re-matched against the vendored source on every run. Nothing here
 * says what anybody must do and nothing here refuses anything — where a funder
 * operates is the entity's decision, and Pacta is not the business engine.
 */
export const McaOperatingRequirements = ({ states }: { states: readonly McaJurisdiction[] }) => {
  const requirements = operatingRequirementsFor(states);
  const unrecorded = statesWithoutAnOperatingRecord(states);

  if (states.length === 0) {
    return null;
  }

  return (
    <section className="rounded-lg border p-5">
      <h3 className="font-semibold">
        <Trans>What these states require of you</Trans>
      </h3>
      <p className="mt-1 text-muted-foreground text-sm">
        <Trans>
          Quoted from each state's own statute, not summarised, and verified against the vendored text rather than
          approved. This is what the law says; what to do about it is yours to decide.
        </Trans>
      </p>

      {requirements.length > 0 && (
        <ul className="mt-4 space-y-4">
          {requirements.map((requirement) => (
            <li key={requirement.id}>
              <p className="font-medium text-sm">
                {JURISDICTION_NAMES[requirement.jurisdiction]} — {requirement.citation}
              </p>
              <blockquote className="mt-1 border-l-2 pl-3 text-sm">{requirement.text}</blockquote>
              <p className="mt-1 text-muted-foreground text-xs">{requirement.note}</p>
            </li>
          ))}
        </ul>
      )}

      {/*
        THE SILENCE IS THE DANGEROUS PART. An empty list could mean "this state
        asks nothing of you" or "we have not looked", and those are opposite
        facts. The library holds registration text for two states of eleven, so
        for the rest it says so rather than letting absence read as absolution.
      */}
      {unrecorded.length > 0 && (
        <p className="mt-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm">
          <Trans>
            This library holds no registration record for {unrecorded.map((s) => JURISDICTION_NAMES[s]).join(', ')}.
            That is not a statement that those states require nothing — it means their requirements have not been
            vendored here, and nothing on this page should be read as covering them.
          </Trans>
        </p>
      )}
    </section>
  );
};
