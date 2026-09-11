import type { McaFacts } from '../clauses/facts';
import { INSTRUMENTS, type McaInstrument } from '../clauses/instruments';
import { inReviewOrder, libraryFor } from '../clauses/library';
import type { McaClause } from '../clauses/types';

/**
 * Turn a funder's answers into the clauses their agreement actually contains.
 *
 * THE STEP A TEMPLATE WITH SLOTS DOES NOT HAVE, and the reason this library
 * exists rather than six Word files. `lease/engine/select-clauses.ts` says it
 * for the other vertical:
 *
 *   > A template's numbering is written into the template, so an unanticipated
 *   > term has nowhere to go but a free-text box at the back … Here, numbering
 *   > is derived from what survives selection, so a clause added mid-document
 *   > renumbers everything after it automatically, **and a clause that drops out
 *   > leaves no gap.**
 *
 * That last clause is why this package has no `[Reserved]` sections and never
 * will. A document being edited in place needs them, to hold section numbers
 * still for the references pointing at them. A document being assembled does
 * not: the clause is simply not selected, and nothing downstream knows it could
 * have been.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO YET. It does not number. `McaClause.number`
 * is still the number the document prints, and removing it is
 * [ADR 0011](../../../../docs/adr/0011-the-mca-clause-library-is-a-library.md)
 * phase 4 — a change that has to reproduce v4's numbering exactly or break every
 * review locus and all five live Pacta templates. Selecting and numbering are
 * separable, and shipping the half that is provable beats claiming both.
 *
 * It also has no `supersedes` and no `asserts`. The lease has both; this corpus
 * has no member for either yet, and a mechanism with no user is the forward
 * scaffolding `clauses/types.ts` warns about.
 */

export type SelectClausesOptions = {
  facts: McaFacts;
  instrument: McaInstrument;
  /** Defaults to the instrument's published library. Overridable for tests. */
  library?: McaClause[];
};

export type SelectClausesResult = {
  /** The clauses this funder's answers put in the document, in reading order. */
  selected: McaClause[];
  /**
   * The clauses the library holds for this instrument and these answers exclude.
   *
   * RETURNED RATHER THAN DISCARDED, because "what did the interview decide
   * against?" is a question an attorney reviewing a template will ask, and a
   * function that silently drops the answer cannot be asked it. It is also how
   * a reviewer sees that a clause exists at all — the ACH backstop is invisible
   * to a Lombard reader otherwise.
   */
  excluded: { clause: McaClause; because: string }[];
};

/** `null` means always. See `McaClause.includeWhen`. */
const applies = (clause: McaClause, facts: McaFacts): boolean =>
  clause.includeWhen === null || clause.includeWhen(facts);

export const selectClauses = ({ facts, instrument, library }: SelectClausesOptions): SelectClausesResult => {
  const candidates = library ?? libraryFor(instrument);

  const wrongInstrument = candidates.find((clause) => clause.instrument !== instrument);

  if (wrongInstrument) {
    /*
      Refused rather than filtered. The Equipment Lease and the Subscription
      number their clauses IDENTICALLY, so a caller that assembled one library
      into the other's document would produce something that reads correct;
      `clauses/library.ts` makes the same argument for reaching clauses through
      `libraryFor` rather than importing an instrument's module directly.
    */
    throw new Error(
      `selectClauses was given ${wrongInstrument.slug}, which is a ${wrongInstrument.instrument} clause, ` +
        `while assembling the ${instrument}`,
    );
  }

  const selected = inReviewOrder(candidates.filter((clause) => applies(clause, facts)));

  const excluded = candidates
    .filter((clause) => !applies(clause, facts))
    .map((clause) => ({
      clause,
      because: `these answers do not satisfy the condition on ${clause.slug}`,
    }));

  return { selected, excluded };
};

/**
 * Every instrument this funder's answers put in front of a counterparty.
 *
 * The ISO PRA is the one a merchant must never be handed — its §2.6 exists
 * because 10 CCR §952 and 23 NYCRR §600.21 regulate what a broker may put in
 * front of a recipient — so `merchantFacing()` in `clauses/instruments.ts`
 * remains the filter for anything merchant-bound. This answers a different
 * question: which agreements does this PRODUCT involve at all.
 */
export const instrumentsFor = (facts: McaFacts): McaInstrument[] =>
  (Object.keys(INSTRUMENTS) as McaInstrument[]).filter((id) => {
    if (id === 'iso-pra') {
      return facts.brokerChannel;
    }
    if (id === 'permission-to-release') {
      return facts.consumerReportPulled;
    }
    if (id === 'split-funding') {
      return facts.collectionMethod !== 'ach-only';
    }
    if (id === 'equipment-lease' || id === 'subscription') {
      /*
       * A funder that offers equipment needs both documents in the suite,
       * because the merchant elects buy or lease when signing and the FRPA
       * sends the lease path to "a separate written agreement" (§002). Which
       * one a given merchant signs is decided at the deal, not here.
       *
       * This read `=== 'separate-lease'` while `LOMBARD_FACTS` said `deferred`,
       * so the only funder in the library got a product whose FRPA referred to
       * two agreements the product did not include.
       */
      return facts.equipment !== 'none';
    }

    return true;
  });
