import { Button } from '@documenso/ui/primitives/button';
import { Trans } from '@lingui/react/macro';
import { type ReactNode, useState } from 'react';
import { LegalText, LegalWorkspace, legalItemId, ReferenceWorkspace } from '../../legal-ui/reader';
import type { McaReviewItem, McaReviewPackage } from '../review/package-schema';

export const McaPackageCounselReader = ({
  snapshot,
  reviewerName,
  expiresAt,
  changedDocuments,
  requirementsChanged,
  renderFinding,
}: {
  snapshot: McaReviewPackage;
  reviewerName: string;
  expiresAt: Date;
  changedDocuments: string[];
  requirementsChanged: boolean;
  renderFinding: (item: McaReviewItem) => ReactNode;
}) => {
  const [selected, setSelected] = useState(snapshot.documents[0].id);
  const [context, setContext] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const active = snapshot.documents.find((document) => document.id === selected);
  const items = snapshot.documents.flatMap((document) =>
    document.sections.flatMap((section) =>
      section.items.map((item) => ({ ...item, instrument: document.id, section: section.id })),
    ),
  );
  return (
    <LegalWorkspace>
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-8" data-mca-counsel-package>
        <header className="space-y-3">
          <h1 className="font-semibold text-3xl">{snapshot.title}</h1>
          <p>
            <Trans>Prepared for</Trans> {reviewerName} · <Trans>Link expires</Trans>{' '}
            {new Date(expiresAt).toLocaleDateString()}
          </p>
          <p className="text-muted-foreground text-sm">
            <Trans>
              Saved review copy. No merchant or partner may sign or receive this as an executed transaction.
            </Trans>
          </p>
        </header>
        {(changedDocuments.length > 0 || requirementsChanged) && (
          <div role="status" className="rounded-lg border border-amber-500 bg-amber-50 p-4 text-amber-950">
            <Trans>
              The live library has changed. You are still reading the saved package originally shared. Findings remain
              attached to this copy; request a new link to review the updated package.
            </Trans>
            {changedDocuments.length > 0 && (
              <p>
                {changedDocuments
                  .map((id) => snapshot.documents.find((document) => document.id === id)?.title ?? id)
                  .join('; ')}
              </p>
            )}
            {requirementsChanged && (
              <p>
                <Trans>Disclosure or requirement sources have changed.</Trans>
              </p>
            )}
          </div>
        )}
        <details open className="space-y-3 rounded-lg border p-5">
          <summary className="cursor-pointer font-semibold text-xl">
            <Trans>Review brief</Trans>
          </summary>
          <p>
            <Trans>
              This shared MCA library supports a provider interview, reusable provider templates, and then
              transaction-specific packages. The buyer and equipment provider are roles awaiting a provider’s legal
              identities. This review does not assume a particular funder’s business policy.
            </Trans>
          </p>
          <p>
            <Trans>
              Review all six instruments together, including reusable field groups, document blocks and interview
              guidance. Consider purchase characterization, collection and reconciliation, recourse, equipment
              obligations, permissions, broker duties and contradictions across documents. Only operative clauses
              receive numbers. Interview guidance is excluded from contracts.
            </Trans>
          </p>
          <p>
            <Trans>
              Alternatives are review examples, not simultaneous obligations or confirmed commercial instructions. Each
              alternative uses its own numbering context. Provider answers determine the final selection and recipient;
              for example, the broker agreement is not a merchant agreement.
            </Trans>
          </p>
          <p className="text-sm">{snapshot.profileDescription}</p>
          <p>
            <Trans>
              The split-funding material is Payzli-specific processor-controlled context. Providers generally have
              limited ability to change processor forms. Record contradictions for review with the processor; this
              library cannot establish processor acceptance. Additional processors require their own forms.
            </Trans>
          </p>
          <p>
            <Trans>
              Disclosures and requirements are included with their source records and verification limitations. Some
              prescribe wording or layout; others require information with provider-authored wording. Review
              applicability and consistency without treating prescribed material as freely editable. These are source
              specifications, not completed transaction disclosures or confirmation of current law.
            </Trans>
          </p>
          <p>
            <Trans>
              Record findings beside the affected content. Staff record any attorney approval separately against exact
              wording. A clause approval does not approve the entire package, resolve other findings, or establish
              readiness to send.
            </Trans>
          </p>
          <p>
            <Trans>Review contact:</Trans> {snapshot.contact}
          </p>
        </details>
        <nav aria-label="Counsel package" className="flex flex-wrap gap-2">
          {snapshot.documents.map((document) => (
            <Button
              key={document.id}
              variant={selected === document.id ? 'default' : 'outline'}
              onClick={() => {
                setSelected(document.id);
                setContext(null);
                setQuery('');
              }}
            >
              {document.title}
            </Button>
          ))}
          <Button
            variant={selected === 'requirements' ? 'default' : 'outline'}
            onClick={() => {
              setSelected('requirements');
              setQuery('');
            }}
          >
            <Trans>Disclosures & requirements</Trans>
          </Button>
        </nav>
        <ReferenceWorkspace
          items={items}
          contexts={snapshot.contexts}
          captureReturn={() => {
            const saved = { selected, context, query };
            return () => {
              setSelected(saved.selected);
              setContext(saved.context);
              setQuery(saved.query);
            };
          }}
          onNavigate={(reference) => {
            setSelected(reference.instrument);
            setContext(reference.context);
            setQuery('');
          }}
        >
          {active && (
            <section className="space-y-5">
              <h2 className="font-semibold text-2xl">{active.title}</h2>
              <p className="text-muted-foreground text-sm">
                {active.counterparty} ·{' '}
                {active.control === 'processor-controlled'
                  ? 'Payzli processor-controlled context; acceptance required separately'
                  : 'Authored provisions and reusable content'}
              </p>
              <label className="block">
                <Trans>Search this instrument</Trans>
                <input
                  className="mt-1 block w-full rounded border p-2"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              {context && (
                <p className="rounded border p-3 text-sm">
                  <Trans>Reference context:</Trans> {context}{' '}
                  <Button variant="ghost" onClick={() => setContext(null)}>
                    <Trans>Return to example numbering</Trans>
                  </Button>
                </p>
              )}
              {active.sections.map((section) => {
                const visible = section.items.filter((item) =>
                  `${item.heading} ${item.text}`.toLowerCase().includes(query.toLowerCase()),
                );
                if (visible.length === 0) {
                  return null;
                }
                return (
                  <section
                    key={section.id}
                    className="space-y-6 rounded-lg border p-5"
                    data-mca-package-section={section.id}
                  >
                    <h3 className="border-b pb-3 font-semibold text-xl">{section.name}</h3>
                    {visible.map((item) => {
                      const reading = (context ? snapshot.contexts[context]?.[item.slug] : null) ?? item.reading;
                      return (
                        <article
                          key={item.slug}
                          id={legalItemId(item.slug)}
                          tabIndex={-1}
                          data-mca-package-item={item.slug}
                          className="scroll-mt-6 space-y-4 border-b pb-6 last:border-0"
                        >
                          <h4 className="font-semibold text-lg">
                            {reading.number && <span className="mr-2">{reading.number}</span>}
                            {item.heading}
                          </h4>
                          <p className="text-muted-foreground text-sm">
                            {item.kind === 'clause'
                              ? item.included
                                ? 'Example selection'
                                : 'Alternative — separate selection'
                              : item.kind === 'guidance'
                                ? 'Interview guidance — excluded from contracts'
                                : 'Reusable content — no clause number'}
                            {item.selectionNote ? ` · ${item.selectionNote}` : ''}
                          </p>
                          <LegalText sourceId={item.slug} segments={reading.segments} />
                          {item.fields.length > 0 && (
                            <dl className="grid gap-3 rounded bg-muted/20 p-4 sm:grid-cols-2">
                              {item.fields.map((field) => (
                                <div key={field.binding}>
                                  <dt className="font-medium">{field.label}</dt>
                                  <dd className="text-muted-foreground text-sm">
                                    {field.kind} · {field.required ? 'Required' : 'Optional'}
                                    {field.condition ? ` when ${field.condition}` : ''}
                                  </dd>
                                </div>
                              ))}
                            </dl>
                          )}
                          {item.repeatFor && (
                            <p className="text-sm">
                              <Trans>Repeat this field group for each</Trans> {item.repeatFor}.
                            </p>
                          )}
                          <details className="text-muted-foreground text-sm">
                            <summary className="cursor-pointer">
                              <Trans>Provision context</Trans>
                            </summary>
                            <p>{item.rationale}</p>
                            <p>{item.variation}</p>
                            {item.states.length > 0 && <p>{item.states.join(', ')}</p>}
                          </details>
                          {renderFinding(item)}
                        </article>
                      );
                    })}
                  </section>
                );
              })}
            </section>
          )}
        </ReferenceWorkspace>
        {selected === 'requirements' && (
          <section className="space-y-5">
            <h2 className="font-semibold text-2xl">
              <Trans>Disclosures & requirements</Trans>
            </h2>
            <p>
              <Trans>
                Determine coverage, exemptions, effective dates and required forms for each provider and transaction.
                These saved source records do not certify current law.
              </Trans>
            </p>
            {snapshot.requirements.map((requirement) => (
              <details
                key={requirement.slug}
                className="rounded-lg border p-4"
                data-mca-review-requirement={requirement.slug}
              >
                <summary className="cursor-pointer font-semibold">
                  {requirement.jurisdictionName} · {requirement.citation}
                </summary>
                <div className="mt-4 space-y-3 text-sm">
                  <p>
                    {requirement.kind} · {requirement.transaction}
                  </p>
                  <p>
                    <Trans>Last source reading:</Trans> {requirement.lastReadAt ?? 'Not recorded'} ·{' '}
                    <Trans>Words verified:</Trans> {requirement.verbatimVerifiedAt ?? 'Not recorded'} ·{' '}
                    <Trans>Structure verified:</Trans>{' '}
                    {requirement.structureVerifiedAt ?? 'Not applicable / not recorded'}
                  </p>
                  <p className="whitespace-pre-wrap">{requirement.sourceEvidence}</p>
                  {requirement.sourceUrls.map((url) => (
                    <a key={url} href={url} rel="noreferrer" target="_blank" className="block break-all underline">
                      {url}
                    </a>
                  ))}
                  <p>
                    <Trans>Saved source digest:</Trans>{' '}
                    <span className="break-all font-mono">{requirement.sourceDigest}</span>
                  </p>
                  {requirement.observedDigest !== requirement.sourceDigest && (
                    <p role="alert">
                      <Trans>The source is missing or no longer matches the recorded verification.</Trans>
                    </p>
                  )}
                  {requirement.limitations.map((limitation, index) => (
                    <p key={`${index}:${limitation}`} className="text-amber-800 dark:text-amber-300">
                      {limitation}
                    </p>
                  ))}
                  {requirement.entries.map((entry, index) => (
                    <div key={`${entry.label}:${index}`} className="space-y-2 border-t pt-3">
                      <h3 className="font-semibold">
                        {index + 1}. {entry.label}
                      </h3>
                      {entry.paragraphs.map((paragraph, part) => (
                        <p key={`${part}:${paragraph}`} className="whitespace-pre-wrap">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </section>
        )}
      </main>
    </LegalWorkspace>
  );
};
