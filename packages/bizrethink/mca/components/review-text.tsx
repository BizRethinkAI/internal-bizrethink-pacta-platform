import { Trans } from '@lingui/react/macro';
import { LegalText } from '../../legal-ui/reader';
import type { LegalReading } from '../../legal-ui/reading';
import type { McaReviewItem } from '../review/package-schema';
import {
  fieldRequirement,
  groupReviewFields,
  type ReviewDocument,
  reviewFieldParts,
  reviewParagraphs,
} from '../review/presentation';

/** Labels annotate blanks in the saved copy; they never supply a transaction value. */
export const McaReviewText = ({
  document,
  item,
  reading = item.reading,
  large,
  preview = false,
}: {
  document: ReviewDocument;
  item: McaReviewItem;
  reading?: LegalReading;
  large: boolean;
  preview?: boolean;
}) => {
  const annotations = reviewFieldParts(reading.segments.map((segment) => segment.text).join(''), document, item).filter(
    (part) => part.kind === 'field',
  );
  const unique = annotations.filter(
    (part, index) => annotations.findIndex((other) => other.original === part.original) === index,
  );
  return (
    <div className="space-y-3" data-mca-review-text>
      <LegalText
        sourceId={`${preview ? 'peek-' : ''}${item.slug}`}
        large={large}
        paragraphs={reviewParagraphs(reading.segments)}
        renderText={(text) =>
          reviewFieldParts(text, document, item).map((part, index) =>
            part.kind === 'field' ? (
              <span
                key={index}
                data-review-field
                data-original-text={part.original}
                className="rounded bg-muted px-0.5 text-foreground underline decoration-muted-foreground decoration-dotted underline-offset-4"
              >
                {part.text}
              </span>
            ) : (
              part.text
            ),
          )
        }
      />
      {unique.length > 0 && (
        <details className={`rounded border px-3 py-2 ${large ? 'text-lg' : 'text-sm'}`} data-mca-field-annotations>
          <summary className="cursor-pointer">
            <Trans>Field details</Trans> · {unique.length}
          </summary>
          <p className="my-3 text-muted-foreground">
            <Trans>
              Bracketed labels identify unfilled fields. They are reading aids, not supplied values. Original notation
              is retained below.
            </Trans>
          </p>
          <dl className="space-y-3">
            {unique.map((part) => (
              <div key={part.original}>
                <dt className="font-medium">{part.label}</dt>
                <dd className="break-all font-mono text-muted-foreground">{part.original}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </div>
  );
};

export const McaReviewFields = ({ fields, large }: { fields: McaReviewItem['fields']; large: boolean }) => (
  <div
    className={`space-y-5 rounded bg-muted/20 p-4 leading-relaxed ${large ? 'text-lg' : 'text-base'}`}
    data-mca-review-fields
  >
    {groupReviewFields(fields).map((group, index) => (
      <section key={`${group.label}:${index}`} aria-label={group.label}>
        <h5 className="mb-3 border-b pb-2 font-semibold">{group.label}</h5>
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          {group.fields.map((field) => (
            <div key={field.binding}>
              <dt className="font-medium">{field.label}</dt>
              <dd className="text-muted-foreground">
                {fieldKindLabels[field.kind] ?? field.kind} · {fieldRequirement(field)}
                {field.condition && field.condition !== 'guarantor.kind = entity' && (
                  <details className="mt-1">
                    <summary className="cursor-pointer">
                      <Trans>Field details</Trans>
                    </summary>
                    <p className="break-words font-mono">{field.condition}</p>
                  </details>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    ))}
  </div>
);

const fieldKindLabels: Record<string, string> = {
  text: 'Text entry',
  currency: 'Amount',
  number: 'Number',
  date: 'Date',
  signature: 'Signature',
  initials: 'Initials',
  checkbox: 'Checkbox',
  percentage: 'Percentage',
  email: 'Email',
};
