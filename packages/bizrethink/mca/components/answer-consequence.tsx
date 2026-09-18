import { INSTRUMENTS } from '../clauses/instruments';
import type { McaAnswerConsequence } from '../entities/consequences';

/**
 * What choosing this option would do to the documents.
 *
 * Derived, never described. The lease builder's rule holds: this OBSERVES a
 * consequence and never recommends a choice — "arbitration replaces the jury
 * trial waiver" is a fact about the paper, "we recommend arbitration" is advice
 * about a funder's legal position, and the second is not Pacta's to give.
 *
 * Shown for the options NOT currently chosen. The chosen one changes nothing by
 * definition, and a row of "no change" is noise that hides the row that matters.
 */
export const McaConsequenceList = ({ consequence }: { consequence?: McaAnswerConsequence }) => {
  if (!consequence) {
    return null;
  }

  const { adds, removes, replaces, documentsAdded, documentsRemoved } = consequence;

  if (
    adds.length === 0 &&
    removes.length === 0 &&
    replaces.length === 0 &&
    documentsAdded.length === 0 &&
    documentsRemoved.length === 0
  ) {
    return null;
  }

  const named = (instrument: string) => INSTRUMENTS[instrument as keyof typeof INSTRUMENTS]?.title ?? instrument;

  return (
    <ul className="space-y-1 text-sm" data-mca-consequence>
      {documentsAdded.map((instrument) => (
        <li key={`doc-add-${instrument}`} className="text-emerald-800">
          Adds a document: <strong>{named(instrument)}</strong>
        </li>
      ))}
      {documentsRemoved.map((instrument) => (
        <li key={`doc-remove-${instrument}`} className="text-amber-800">
          Removes the <strong>{named(instrument)}</strong> entirely
        </li>
      ))}
      {replaces.map((heading) => (
        <li key={`replace-${heading}`} className="text-muted-foreground">
          Replaces <strong>{heading}</strong> with a different version
        </li>
      ))}
      {adds.map((heading) => (
        <li key={`add-${heading}`} className="text-emerald-800">
          Adds <strong>{heading}</strong>
        </li>
      ))}
      {removes.map((heading) => (
        <li key={`remove-${heading}`} className="text-amber-800">
          Removes <strong>{heading}</strong>
        </li>
      ))}
    </ul>
  );
};
