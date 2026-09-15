import { Trans } from '@lingui/react/macro';

import { legalItemId } from '../../legal-ui/reader';
import type { McaReviewPackage } from '../review/package-schema';
import { sourceEntryPresentation } from '../review/presentation';

export const McaReviewRequirements = ({
  requirements,
  large,
}: {
  requirements: McaReviewPackage['requirements'];
  large: boolean;
}) => (
  <section className={`space-y-5 leading-relaxed ${large ? 'text-lg' : 'text-base'}`}>
    <p>
      <Trans>
        Determine coverage, exemptions, effective dates and required forms for each provider and transaction. These
        saved source records do not certify current law.
      </Trans>
    </p>
    <p className="text-muted-foreground">
      <Trans>
        Source wording, layout instructions and verification evidence are shown separately. This is a reading view of
        the saved specification, not a completed disclosure form.
      </Trans>
    </p>
    {requirements.map((requirement) => (
      <details
        key={requirement.slug}
        id={legalItemId(`requirement:${requirement.slug}`)}
        tabIndex={-1}
        className="rounded-lg border p-4"
        data-mca-review-requirement={requirement.slug}
      >
        <summary className="cursor-pointer font-semibold">
          {requirement.jurisdictionName} · {requirement.citation}
        </summary>
        <div className="mt-4 space-y-5">
          <p>
            {requirementLabels[requirement.kind]} ·{' '}
            {transactionLabels[requirement.transaction] ?? requirement.transaction}
          </p>
          <div className="space-y-2 rounded bg-muted/30 p-3">
            <p>
              <Trans>Last source reading:</Trans> {reviewDate(requirement.lastReadAt)}
            </p>
            <p>
              <Trans>Words verified:</Trans> {reviewDate(requirement.verbatimVerifiedAt)}
            </p>
            <p>
              <Trans>Structure verified:</Trans>{' '}
              {reviewDate(requirement.structureVerifiedAt, 'Not applicable / not recorded')}
            </p>
          </div>
          {requirement.observedDigest !== requirement.sourceDigest && (
            <p role="alert">
              <Trans>The source is missing or no longer matches the recorded verification.</Trans>
            </p>
          )}
          {requirement.limitations.length > 0 && (
            <ul className="list-disc space-y-2 pl-5 text-amber-800 dark:text-amber-300">
              {requirement.limitations.map((limitation, index) => (
                <li key={index}>{limitation}</li>
              ))}
            </ul>
          )}
          {requirement.sourceUrls.map((url, index) => (
            <a key={url} href={url} rel="noreferrer" target="_blank" className="block break-words underline">
              <Trans>Open recorded source</Trans> {index + 1} · {sourceHost(url)}
            </a>
          ))}
          <details className="rounded border p-3" data-mca-source-evidence>
            <summary className="cursor-pointer">
              <Trans>Source evidence & verification details</Trans>
            </summary>
            <p className="mt-3 whitespace-pre-wrap">{requirement.sourceEvidence}</p>
            <p className="mt-3">
              <Trans>Saved source digest:</Trans>{' '}
              <span className="break-all font-mono">{requirement.sourceDigest}</span>
            </p>
          </details>
          {requirement.entries.map((entry, index) => (
            <section key={`${entry.label}:${index}`} className="space-y-4 border-t pt-5" data-mca-source-entry>
              <h3 className="font-semibold">
                {index + 1}. {entry.label}
              </h3>
              <dl className="space-y-4">
                {sourceEntryPresentation(entry, requirement.entries)
                  .filter((row) => !row.technical)
                  .map((row, part) => (
                    <div key={part}>
                      <dt className="mb-1 font-medium text-muted-foreground">{row.label}</dt>
                      <dd className="whitespace-pre-wrap break-words">
                        {row.label === 'Source wording' || row.label === 'Provider-authored wording' ? (
                          <blockquote className="border-l-2 pl-4 font-serif leading-[1.85]" data-mca-source-wording>
                            {row.text}
                          </blockquote>
                        ) : (
                          row.text
                        )}
                        {row.citation && <p className="mt-2 text-muted-foreground">{row.citation}</p>}
                      </dd>
                    </div>
                  ))}
              </dl>
              <details className="text-muted-foreground" data-mca-source-specification>
                <summary className="cursor-pointer">
                  <Trans>Saved specification</Trans>
                </summary>
                <div className="mt-3 space-y-2">
                  {entry.paragraphs.map((paragraph, part) => (
                    <p key={part} className="whitespace-pre-wrap break-words">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </details>
            </section>
          ))}
        </div>
      </details>
    ))}
  </section>
);

export const reviewDate = (value: string | Date | null, empty = 'Not recorded') => {
  if (!value) {
    return empty;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(date);
};

const sourceHost = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

const requirementLabels = {
  'prescribed-form': 'Prescribed form',
  itemization: 'Itemization',
  'content-statute': 'Required information',
};
const transactionLabels: Record<string, string> = {
  'lease-financing': 'Lease financing',
  'sales-based-financing': 'Sales-based financing',
  'any-commercial-financing': 'Any commercial financing',
};
