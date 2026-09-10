import type { ClauseSource } from '../../provenance/types';
import type { ClauseStatus } from '../../server-only/feature-access';
import type { McaJurisdiction } from '../jurisdictions';
import type { ClauseExamination } from './examination';
import type { McaFacts } from './facts';
import type { McaInstrument } from './instruments';

export type { ClauseExamination } from './examination';

/**
 * One numbered clause of one of the negotiated agreements.
 *
 * HOW THIS DIFFERS FROM THE LEASE'S `Clause`, AND WHY. The lease library's
 * clause is organised by jurisdiction, because a residential lease is one
 * document whose contents a state decides. Nothing here works that way. An MCA
 * deal is a SET of documents — a purchase agreement, a state disclosure, a
 * processor authorisation, sometimes an equipment lease — and the question that
 * organises a clause is which of them it is in. So `instruments` sits where the
 * lease has `jurisdiction`, and state law arrives on a narrower field below.
 *
 * WHAT IS DELIBERATELY ABSENT. There is no `includeWhen` and no `variables`
 * yet. Both belong to the engine, which is not built, and this package has
 * already paid for forward scaffolding once: the AI config asked for a GCP
 * project id, a location and an API key for four months before anything read
 * any of them, and shaped a UI around the wrong product. A clause here is text
 * with provenance. When the builder needs to select between clauses it will
 * need a facts type, and that type should be derived from what the clauses
 * actually branch on rather than guessed at now.
 */
/**
 * What a library entry actually is.
 *
 * THE DISCRIMINATOR THAT DID NOT EXIST, AND WHAT ITS ABSENCE COST. Three
 * guarantor-identity grids were imported with `body: ''` — the FRPA's §9.1 and
 * both twins' §4.1 — because that is genuinely what those sections hold: a
 * table of AcroForm widgets under a heading, no prose. `feat/mca-clauses-twins`
 * recorded the decision under "Not done, on purpose".
 *
 * The reading was defensible; the representation was not. **A deliberate empty
 * body and a dropped one are byte-identical**, so nothing could tell them apart
 * — not `frpa-coverage.test.ts`, which asks whether every LINE is inside a
 * clause and never whether every CLAUSE has content, and not a reader. An
 * outside attorney opened the FRPA on a counsel link in September 2026 and
 * could not review the guarantor execution block at all.
 *
 * `kind` says which it is, and `__tests__/every-clause-has-content.test.ts`
 * then demands the right content for each.
 *
 * NO FOURTH VALUE WITHOUT A MEMBER AND A DISTINCT BEHAVIOUR. `frpa.definitions`
 * is a `clause`, not a `definition` — defined terms bind, so it is operative
 * text, and a kind no gate branches on is a field with no user.
 * [ADR 0011](../../../../docs/adr/0011-the-mca-clause-library-is-a-library.md).
 */
export type McaClauseKind =
  /** Operative contract text. The default, and all but three of the corpus. */
  | 'clause'
  /** A grid the parties complete. Holds `fields`, never a body. */
  | 'field-group'
  /**
   * Non-operative prose describing an operative term — the FRPA's four Funding
   * Terms explainers. Still text a merchant reads, so it still needs an author
   * before it may be published; it is separated because it READS as operative
   * while describing something that is not, which is why the 2026-09-09 counsel
   * memo rates the holdback explainer High.
   */
  | 'explainer';

/**
 * One blank in a form grid.
 *
 * `widget` is the `«N»` AcroForm anchor the Lombard pipeline injects, carried
 * verbatim for the same reason clause bodies carry theirs (README rule 2):
 * without it nothing can be filled in, and a tidied copy would make the check
 * a check against a tidied document.
 *
 * IT IS NOT OPTIONAL EVEN THOUGH IT LOOKS INCIDENTAL. The Equipment Lease and
 * the Subscription number their fields IDENTICALLY — both `«21»`–`«24»` — so a
 * group copied from one twin to the other looks correct in review and is only
 * wrong at injection time.
 */
export type ClauseField = {
  /** As the document prints it: "Full Name", "Social Security Number". */
  label: string;
  /** The AcroForm anchor, e.g. `«35»`. */
  widget: string;
  kind: 'text' | 'date' | 'signature' | 'ssn' | 'currency';
  required: boolean;
};

export type McaClause = {
  slug: string;
  version: number;

  /**
   * The agreement this clause is published in. Exactly one.
   *
   * IT WAS AN ARRAY, AND THE CORPUS DISPROVED THE REASON FOR IT. The plural
   * existed so that a clause published in two agreements could be stored once
   * and be unable to diverge — aimed squarely at the Equipment Lease and the
   * Subscription, which REVIEW-02 found are the same document with its
   * vocabulary swapped and its numbering identical.
   *
   * They are. But the swap was made by hand and is not a function: inside §3.2
   * alone, `leased` becomes `you subscribe for` in one sentence and `subscribed
   * for` in the next. The two documents share no vocabulary-bearing sentence,
   * so there was never anything to store once, and across all 177 clauses of
   * four instruments not one names a second. A field with no user reads as
   * evidence that sharing happens here. It does not.
   *
   * What replaced it is `twins.ts`, which ASSERTS the two documents' agreement
   * instead of generating it — REVIEW-02's *"a fix applied to one and not the
   * other is a divergence nothing checks for"* answered by checking for it.
   *
   * If a genuinely shared clause ever appears, widening this back is a small
   * change and a deliberate one. That is the intended cost, and it is the same
   * argument `jurisdictions.ts` makes about adding a federal disclosure.
   */
  instrument: McaInstrument;

  /** What this entry is. See `McaClauseKind`. */
  kind: McaClauseKind;

  /**
   * When this clause is in the agreement. `null` means always.
   *
   * REQUIRED RATHER THAN OPTIONAL, and that is the whole point. An optional
   * `includeWhen` would let a conditional clause be added with no condition and
   * silently reach every template — the failure this field exists to prevent.
   * `null` is a decision a reader can see; a missing field is not.
   *
   * A predicate rather than a data structure, following the lease's `Clause`.
   * The alternative — a serialisable rule tree — buys storage in a database
   * nothing here has, at the cost that the condition stops being readable
   * beside the words it governs.
   */
  includeWhen: ((facts: McaFacts) => boolean) | null;

  /**
   * The blanks, when `kind` is `field-group`; absent otherwise.
   *
   * Deliberately not `ClauseField[]` defaulting to `[]`: an empty array on a
   * prose clause would be a third way of saying "no fields" beside `undefined`
   * and `kind !== 'field-group'`, and the test asserts the absence rather than
   * tolerating either.
   */
  fields?: ClauseField[];

  /**
   * The number the document itself prints — `A.4`, `2.6`, `3.12`.
   *
   * A LABEL, NOT AN IDENTITY. REVIEW-01's finding loci name numbers that have
   * since moved: its `§A.5 Clawback Provision` is the shipped v2's A.4, because
   * the fixes that review produced removed a section above it. The stable
   * identity is `slug`; this is what a reader is looking at on the page.
   */
  number: string;

  /** Logical group within the instrument. Drives reading order, not numbering. */
  section: string;
  sortKey: number;

  heading: string;
  /**
   * The clause's words, as the document publishes them.
   *
   * VERBATIM, INCLUDING THE `«N»` WIDGET MARKERS. Those markers are the
   * AcroForm anchors the Lombard pipeline injects, and they are part of the
   * published document. Cleaning them out here would make the body prettier and
   * make `containsClauseText` a check against a tidied copy of the agreement
   * rather than against the agreement — which is the whole value of the check.
   * Rendering is the renderer's problem, and this fork deliberately does not
   * flatten those widgets (overlays 018 and 040).
   */
  body: string;

  source: ClauseSource;
  status: ClauseStatus;

  /**
   * The states whose law scopes this clause, or empty when none does.
   *
   * NOT A JURISDICTION FILTER, AND NOT `McaJurisdiction`'S JOB TURNED INSIDE
   * OUT. On a disclosure spec, `McaJurisdiction` means "this form IS prescribed
   * by that state". Here it means "this clause is in the document because of
   * that state's law" — ISO PRA §2.6 is in the agreement because 10 CCR §952
   * and 23 NYCRR §600.21 regulate what a broker may hand a recipient, which is
   * why it names two states rather than one.
   *
   * Reusing the type is right: both are answers to "which state's law". Putting
   * the relation in the FIELD NAME rather than the type is what keeps
   * `disclosuresFor`'s exact-equality filter meaning what it says.
   */
  appliesInStates: McaJurisdiction[];

  /** The statute or regulation that compels the clause, where one does. */
  requiredBy?: string;

  /**
   * Which review read this clause, and what it found.
   *
   * REQUIRED AND NON-EMPTY — see `examination.ts` for the argument, and
   * `__tests__/examination-is-recorded.test.ts` for the enforcement. Phase 0's
   * rule was "anything unexamined enters as draft, never as library"; this is
   * that rule made structural instead of remembered.
   */
  examinedBy: ClauseExamination[];
};
