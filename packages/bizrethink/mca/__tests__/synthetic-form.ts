import type { PrescribedForm } from '../prescribed/types';

/**
 * A throwaway form, for exercising the checkers.
 *
 * Several tests build a `PrescribedForm` that is not one of the eleven — a spec
 * seeded from our own document to prove the check runs the other way, or a
 * one-row form carrying the wrong state's sentence. They need the provenance
 * fields only to satisfy the type.
 *
 * The defaults are the honest ones and not conveniences: `status: 'draft'` with
 * both verification dates null. A synthetic form has been verified against
 * nothing, so `assertPublishable` must never be able to wave one through, and
 * these defaults mean it cannot even if a future test hands one to the gate.
 */
export const syntheticForm = (
  over: Pick<PrescribedForm, 'slug' | 'citation' | 'sourceFile' | 'rows'> & Partial<PrescribedForm>,
): PrescribedForm => ({
  jurisdiction: 'US-CA',
  status: 'draft',
  source: {
    kind: 'regulator-prescribed-form',
    citation: over.citation,
    sourceFile: over.sourceFile,
    verbatimVerifiedAt: null,
    structureVerifiedAt: null,
  },
  sourceDigest: 'not-a-verified-form',
  section: null,
  structureEvidence: 'prose-described',
  ...over,
});
