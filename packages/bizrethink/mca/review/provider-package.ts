import { ALL_MCA_CONTENT } from '../catalogue';
import { groupMcaSections } from '../engine/section-headings';
import type { McaTemplateSnapshot } from '../templates/compile';
import { projectTemplateReading } from '../templates/reading';
import { reviewRequirements } from './package';
import { ZProviderReviewPackage } from './package-schema';

export const buildProviderReviewPackage = ({
  compiled,
  templateId,
  revision,
  contact,
  processorText,
}: {
  compiled: McaTemplateSnapshot;
  templateId: string;
  revision: number;
  contact: string;
  processorText: string | null;
}) => {
  const projected = projectTemplateReading(compiled);
  const documents = projected.documents.map((document) => ({
    id: document.instrument,
    title: document.title,
    counterparty: document.counterparty,
    control: 'authored' as const,
    sections: groupMcaSections(document.items).map((section) => ({
      id: section.section,
      name: section.heading,
      items: section.items.map((item) => {
        const source = ALL_MCA_CONTENT.find((candidate) => candidate.slug === item.slug);
        return {
          slug: item.slug,
          version: String(item.version),
          sourceFingerprint: item.sourceFingerprint,
          heading: item.heading,
          number: item.number,
          text: item.body,
          kind: item.kind,
          included: true,
          selectionNote:
            document.transactionSelection === 'always'
              ? null
              : `Conditional transaction document: ${document.transactionSelection}`,
          reading: item.reading,
          rationale:
            source?.whyThisClause.kind === 'discretionary'
              ? 'Commercial drafting — no statute requires this provision.'
              : (source?.whyThisClause.citation ?? ''),
          variation: 'Selected by the saved provider answers; transaction fields and elections remain to be completed.',
          states: source?.appliesInStates ?? [],
          fields: item.fields.map((field) => ({
            label: field.value ? `${field.label}: ${field.value}` : field.label,
            binding: field.binding,
            kind: field.kind,
            required: field.required,
            condition: field.requiredWhen ? `${field.requiredWhen.binding} = ${field.requiredWhen.equals}` : null,
          })),
          repeatFor: item.repeatFor,
        };
      }),
    })),
  }));
  return ZProviderReviewPackage.parse({
    schemaVersion: 2,
    kind: 'provider',
    title: `${compiled.profile.label} — provider counsel review`,
    contact,
    profileDescription:
      'Selected saved provider policy. Transaction elections may still select an equipment document, report authorization or other conditional instrument.',
    provider: {
      templateId,
      revision,
      templateFingerprint: compiled.fingerprint,
      legalName: compiled.profile.buyer.legalName,
      policy: Object.entries(compiled.profile.policy).map(
        ([key, value]) =>
          `${key.replace(/([a-z])([A-Z])/g, '$1 $2')}: ${Array.isArray(value) ? value.join(', ') : String(value)}`,
      ),
    },
    documents,
    contexts: {
      'Saved provider selection': Object.fromEntries(
        projected.documents.flatMap((document) => document.items.map((item) => [item.slug, item.reading])),
      ),
    },
    requirements: reviewRequirements().filter((requirement) =>
      compiled.requirements.some((selected) => selected.slug === requirement.slug),
    ),
    externalDocuments: compiled.externalDocuments.map((document) => ({
      id: document.instrument,
      processor: document.processor,
      title: document.form.title,
      version: document.form.version,
      reference: document.form.reference,
      content: processorText,
    })),
  });
};
