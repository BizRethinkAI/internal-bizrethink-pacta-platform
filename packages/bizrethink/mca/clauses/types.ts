import type { ClauseSource } from '../../provenance/types';
import type { ClauseStatus } from '../../server-only/feature-access';
import type { McaJurisdiction } from '../jurisdictions';
import type { ClauseExamination } from './examination';
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
