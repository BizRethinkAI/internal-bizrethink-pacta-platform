import { readSourceText, sectionOf, sourceExists } from '../provenance/source-text';
import { MCA_DISCLOSURES } from '../registry';

/** Caller enforces admin access. Only a registered disclosure can identify a source file. */
export const disclosureReading = (slug: string) => {
  const spec = MCA_DISCLOSURES.find((item) => item.slug === slug);
  if (!spec) {
    return null;
  }
  const wholeSource = sourceExists(spec.sourceFile) ? readSourceText(spec.sourceFile) : '';
  return {
    slug,
    citation: spec.citation,
    passage: wholeSource ? sectionOf(wholeSource, spec.section) : null,
    wholeSource,
    rows:
      'rows' in spec
        ? spec.rows.map((row, index) => ({
            id: String(index + 1),
            label: row.label,
            text: row.verbatim,
            labelSuffix: row.labelSuffix ?? null,
            onlyPrescribedContent: row.onlyPrescribedContent,
            thirdColumnEmpty: row.thirdColumnEmpty ?? false,
            alsoPermitted: row.alsoPermitted ?? [],
            providerDrafted: row.providerDrafted ?? [],
            citation: spec.citation,
            calculation: null,
            labelPrescribed: true,
            evidence: [],
          }))
        : 'lines' in spec
          ? spec.lines.map((line) => ({
              id: line.id,
              label: line.description ?? line.id,
              text: null,
              labelSuffix: null,
              onlyPrescribedContent: false,
              thirdColumnEmpty: false,
              alsoPermitted: [],
              providerDrafted: [],
              citation: line.citation,
              calculation: line.reference,
              labelPrescribed: line.description !== null,
              evidence: [],
            }))
          : spec.requirements.map((requirement, index) => ({
              id: String(index + 1),
              label: requirement.row ?? 'Unplaced requirement',
              text: requirement.requires,
              labelSuffix: null,
              onlyPrescribedContent: false,
              thirdColumnEmpty: false,
              alsoPermitted: [],
              providerDrafted: [],
              citation: requirement.citation,
              calculation: null,
              labelPrescribed: requirement.labelPrescribed === true,
              evidence: requirement.evidence,
            })),
  };
};
