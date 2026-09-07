import { assertPublishable } from '../../provenance/types';
import type { ContentStatute } from '../content/types';
import { checkAgainstSource } from '../prescribed/conformity';
import { checkItemizationAgainstSource, type ItemizationForm } from '../prescribed/itemization';
import type { PrescribedForm } from '../prescribed/types';
import {
  containsLabel,
  containsPrescribedText,
  MissingSourceError,
  normalisedDigest,
  readSourceText,
  sectionOf,
} from './source-text';

/**
 * Re-earning the verification dates, every run.
 *
 * `assertPublishable` asks whether a date is PRESENT. That is the right
 * question for a package that cannot see the sources, and it is not enough
 * here: a present date is indistinguishable from a typed one, and this package
 * ships eleven states' worth of them.
 *
 * So each date is bound to something re-executed on every run:
 *
 *   verbatimVerifiedAt   every prescribed label and every prescribed sentence
 *                        is still found in the named file, in the section the
 *                        form was transcribed from.
 *   structureVerifiedAt  the source's own digest is unchanged, and — where the
 *                        source prints the form in table order — the labels
 *                        still appear in the order the spec puts them in.
 *
 * The honest limit, stated because a green suite that is read as more than it
 * is becomes the problem: none of this proves a human read the regulation. It
 * proves the bytes have not moved since we said they had, and that everything
 * the spec claims is in those bytes and in the right part of them. When a
 * regulator amends a rule the digest breaks, and a human has to look again.
 * That is the event this is built to catch.
 */
export type ProvenanceProblem = {
  slug: string;
  kind: 'source' | 'digest' | 'section' | 'verbatim' | 'structure' | 'label' | 'publishable' | 'kind';
  detail: string;
};

export type McaDisclosure = PrescribedForm | ItemizationForm | ContentStatute;

const isPrescribedForm = (spec: McaDisclosure): spec is PrescribedForm => 'rows' in spec;
const isItemization = (spec: McaDisclosure): spec is ItemizationForm => 'lines' in spec;

/**
 * Do the labels appear in the source in the order the spec puts them in?
 *
 * A forward scan rather than a set of positions, because two of California's
 * rows are both labelled "Prepayment" and a position lookup would find the same
 * one twice. Scanning forward from the last match is also what "in order"
 * actually means.
 *
 * Takes the labels rather than the form: the itemization prescribes DESCRIPTIONS
 * rather than row labels, and "in order" means the same thing for both. A null
 * label is one the regulation requires and does not word — §956(a)(3)'s payee
 * lines — and is skipped rather than searched for, because there is nothing to
 * search for and pretending otherwise would report a missing label on a
 * conforming form.
 */
const labelsInOrder = (labels: readonly (string | null)[], sourceFile: string, section: string): string[] => {
  const hay = section.toLowerCase().replace(/\s+/g, ' ');
  const problems: string[] = [];
  let cursor = 0;

  for (const [i, raw] of labels.entries()) {
    if (raw === null) {
      continue;
    }

    const label = raw.toLowerCase().replace(/\s+/g, ' ').trim();
    const at = hay.indexOf(label, cursor);

    if (at === -1) {
      problems.push(
        hay.includes(label)
          ? `row ${i}: ${JSON.stringify(raw)} appears in ${sourceFile} but out of the prescribed order`
          : `row ${i}: ${JSON.stringify(raw)} does not appear in ${sourceFile}`,
      );
      continue;
    }

    cursor = at + label.length;
  }

  return problems;
};

export const verifyProvenance = (spec: McaDisclosure): ProvenanceProblem[] => {
  const problems: ProvenanceProblem[] = [];
  const say = (kind: ProvenanceProblem['kind'], detail: string) => problems.push({ slug: spec.slug, kind, detail });

  for (const p of assertPublishable(spec)) {
    say('publishable', p);
  }

  let text: string;

  try {
    text = readSourceText(spec.sourceFile);
  } catch (error) {
    if (error instanceof MissingSourceError) {
      say('source', error.message);

      return problems;
    }

    throw error;
  }

  const digest = normalisedDigest(text);

  if (digest !== spec.sourceDigest) {
    say(
      'digest',
      `${spec.sourceFile} has changed since it was verified (recorded ${spec.sourceDigest.slice(0, 12)}…, found ` +
        `${digest.slice(0, 12)}…). Every verification date on this spec is stale until a human re-reads it.`,
    );
  }

  const section = sectionOf(text, spec.section);

  if (section === null) {
    say(
      'section',
      `the section anchors for ${spec.sourceFile} no longer resolve ` +
        `(${JSON.stringify(spec.section?.from)} … ${JSON.stringify(spec.section?.to)})`,
    );

    return problems;
  }

  if (isPrescribedForm(spec)) {
    if (spec.source.kind !== 'regulator-prescribed-form') {
      say('kind', `a prescribed form must carry regulator-prescribed-form provenance, not ${spec.source.kind}`);

      return problems;
    }

    if (spec.source.verbatimVerifiedAt !== null) {
      for (const d of checkAgainstSource(spec, section)) {
        say('verbatim', d.detail);
      }

      /*
        `alsoPermitted` NEEDS CHECKING TOO.

        `checkAgainstSource` reads a row's `label` and its `verbatim` and stops.
        But `alsoPermitted` is a claim about the regulation every bit as strong
        as the other two — it says the regulator EXPRESSLY permits this sentence
        in a row it otherwise closes with "shall include only" — and against the
        statute it went unverified.

        Not a theoretical gap: it is the field the CA/NY funding-provided
        sentence lives in, and checking it here is what surfaced the
        `providerDrafted` mis-filing below.

        BE PRECISE ABOUT WHICH CHECKER WAS BLIND, THOUGH. The gap was in
        spec-against-statute only. `checkFormConformity`, which governs what a
        RENDERED document may contain, has always read `alsoPermitted` — see
        `conformity.ts`, where it is subtracted from the remainder of an "only"
        row. The templates 104/105 defect was in a rendered document, so this
        particular blindness is not what let it through.
      */
      for (const [i, row] of spec.rows.entries()) {
        for (const permitted of row.alsoPermitted ?? []) {
          if (!containsPrescribedText(section, permitted)) {
            say(
              'verbatim',
              `row ${i}: ${JSON.stringify(permitted.slice(0, 60))}… is recorded as permitted by ` +
                `${spec.citation}, but does not appear in that section of ${spec.sourceFile}`,
            );
          }
        }
      }
    }

    if (spec.source.structureVerifiedAt !== null && spec.structureEvidence === 'source-order') {
      for (const d of labelsInOrder(
        spec.rows.map((r) => r.label),
        spec.sourceFile,
        section,
      )) {
        say('structure', d);
      }
    }

    /*
      A form whose source describes its rows in prose cannot have its order
      machine-checked, so the least it must do is say WHICH prose — an
      unscoped form of this kind is one whose structure claim rests on nothing
      re-executable at all.
    */
    if (spec.structureEvidence === 'prose-described' && spec.section === null) {
      say('structure', 'a prose-described form must name the section it was transcribed from');
    }

    return problems;
  }

  /*
    The Itemization of Amount Financed — §956, §600.17.

    Its own branch because it is its own instrument: no prescribed row count, no
    "shall include only", and DESCRIPTIONS rather than sentences. What it shares
    with a table is exactly the part below — the source must exist, its digest
    must still match, the section anchors must still resolve, and every
    description the spec claims must be found in that section, in order. Those
    are properties of a verification date, not of a table, which is why they are
    reused rather than reimplemented.
  */
  if (isItemization(spec)) {
    if (spec.source.kind !== 'regulator-prescribed-form') {
      say('kind', `an itemization must carry regulator-prescribed-form provenance, not ${spec.source.kind}`);

      return problems;
    }

    if (spec.source.verbatimVerifiedAt !== null) {
      for (const d of checkItemizationAgainstSource(spec, section)) {
        say('verbatim', d.detail);
      }
    }

    if (spec.source.structureVerifiedAt !== null && spec.structureEvidence === 'source-order') {
      for (const d of labelsInOrder(
        spec.lines.map((l) => l.description),
        spec.sourceFile,
        section,
      )) {
        say('structure', d);
      }
    }

    if (spec.structureEvidence === 'prose-described' && spec.section === null) {
      say('structure', 'a prose-described itemization must name the section it was transcribed from');
    }

    return problems;
  }

  if (spec.source.kind !== 'statute') {
    say('kind', `a content-only statute must carry statute provenance, not ${spec.source.kind}`);

    return problems;
  }

  /*
    Kansas and Missouri dictate every label; Florida, Georgia, Louisiana, Texas
    and Utah dictate none. Where a label is prescribed it is the statute's own
    words and can be checked against the statute — "a Kansas form with Florida's
    headings is defective while saying all the right things".
  */
  if (spec.source.verbatimVerifiedAt !== null) {
    for (const req of spec.requirements) {
      if (!req.labelPrescribed || req.row === null) {
        continue;
      }

      if (!containsLabel(section, req.row)) {
        say(
          'label',
          `${req.citation} prescribes the label ${JSON.stringify(req.row)}, which is not in ${spec.sourceFile}`,
        );
      }
    }
  }

  return problems;
};

/**
 * How much of a form's TEXT no check can stand behind.
 *
 * `coverage` in `prescribed/conformity.ts` counts rows whose contents are
 * unchecked because the regulation prescribes "a short explanation" instead of
 * words. This counts the same problem one level down: sentences inside rows
 * that are otherwise verified, which the regulation requires but does not word.
 *
 * Stated as a number and pinned by a test for the same reason `coverage` is:
 * the failure mode of a green suite is being read as a clean form. A new
 * provider-drafted sentence is not forbidden — it is often compelled — but it
 * must not appear without someone noticing.
 */
export const unverifiableSentences = (form: PrescribedForm): { citation: string; row: number }[] =>
  form.rows.flatMap((row, i) => (row.providerDrafted ?? []).map((p) => ({ citation: p.citation, row: i })));

/**
 * The publish gate, over a whole set.
 *
 * Returns the flat strings `assertPublishable` produces, so a caller that only
 * wants to know "may this be published" does not have to understand the
 * verification machinery above.
 */
export const publishableProblems = (specs: readonly McaDisclosure[]): string[] =>
  specs.flatMap((spec) => assertPublishable(spec));
