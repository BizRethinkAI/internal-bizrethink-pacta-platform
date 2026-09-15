import { Button } from '@documenso/ui/primitives/button';
import { Input } from '@documenso/ui/primitives/input';
import { Trans } from '@lingui/react/macro';
import { BookOpenIcon, ListIcon } from 'lucide-react';
import { type ReactNode, useId, useState } from 'react';
import { focusReadingItem, LegalText, LegalWorkspace, legalItemId, ReferenceWorkspace } from '../../legal-ui/reader';
import { packageReviewIndex, searchPackageReviewIndex } from '../review/package-navigation';
import type { McaReviewItem, McaReviewPackage } from '../review/package-schema';
import { reviewTargets } from '../review/targets';

export const McaPackageCounselReader = ({
  snapshot,
  reviewerName,
  expiresAt,
  changedDocuments,
  requirementsChanged,
  renderFinding,
  reviewTools,
  reviewedTargetIds = [],
  providerRevisionCurrent = true,
  providerSourcesCurrent = true,
}: {
  snapshot: McaReviewPackage;
  reviewerName: string;
  expiresAt: Date;
  changedDocuments: string[];
  requirementsChanged: boolean;
  renderFinding: (item: McaReviewItem) => ReactNode;
  reviewTools?: ReactNode;
  reviewedTargetIds?: string[];
  providerRevisionCurrent?: boolean;
  providerSourcesCurrent?: boolean;
}) => {
  const [selected, setSelected] = useState(snapshot.documents[0].id);
  const [subject, setSubject] = useState<string | null>(null);
  const [panel, setPanel] = useState<'brief' | 'reading' | 'progress'>('brief');
  const [indexMode, setIndexMode] = useState<'subjects' | 'all'>('subjects');
  const [context, setContext] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [mobileIndex, setMobileIndex] = useState(false);
  const [large, setLarge] = useState(false);
  const titleId = useId();
  const indexId = useId();
  const active = snapshot.documents.find((document) => document.id === selected);
  const items = packageReviewIndex(snapshot);
  const units = reviewTargets(snapshot).filter((target) => target.reviewUnit);
  const results = searchPackageReviewIndex(
    query.trim() ? items : items.filter((item) => item.instrument === selected),
    query,
  );
  const go = (documentId: string, sectionId: string | null = null) => {
    setSelected(documentId);
    setSubject(sectionId);
    setPanel('reading');
    setContext(null);
    setQuery('');
    setMobileIndex(false);
    focusReadingItem(titleId);
  };
  const openPanel = (next: 'brief' | 'progress') => {
    setPanel(next);
    setMobileIndex(false);
    focusReadingItem(titleId);
  };
  return (
    <LegalWorkspace>
      <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-8" data-mca-counsel-package>
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b pb-5">
          <div className="min-w-0">
            <p className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
              <Trans>Pacta · Counsel workspace</Trans>
            </p>
            <h1 className="font-semibold text-2xl tracking-tight sm:text-3xl">{snapshot.title}</h1>
            <p className="mt-2 text-muted-foreground text-sm">
              <Trans>Prepared for</Trans> {reviewerName} · <Trans>Link expires</Trans>{' '}
              {new Date(expiresAt).toLocaleDateString()}
            </p>
          </div>
          <Button variant="outline" onClick={() => openPanel('brief')}>
            <BookOpenIcon className="mr-2 h-4 w-4" />
            <Trans>Review brief</Trans>
          </Button>
        </header>
        {(changedDocuments.length > 0 ||
          requirementsChanged ||
          !providerRevisionCurrent ||
          !providerSourcesCurrent) && (
          <div role="status" className="mb-6 rounded-lg border border-amber-500 bg-amber-50 p-4 text-amber-950">
            <Trans>
              You are reading the saved package originally shared. The changes listed below concern the current library
              or provider template. Findings remain attached to this copy; request a new link to review the updated
              package.
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
            {!providerRevisionCurrent && (
              <p>
                <Trans>
                  A newer provider revision exists. This review applies only to the saved revision named here.
                </Trans>
              </p>
            )}
            {!providerSourcesCurrent && (
              <p>
                <Trans>
                  The provider template’s source content or selection rules have changed. Create a new template revision
                  and review link for current use.
                </Trans>
              </p>
            )}
          </div>
        )}

        <ReferenceWorkspace
          items={items}
          contexts={snapshot.contexts}
          captureReturn={() => {
            const saved = { selected, subject, panel, context, query };
            return () => {
              setSelected(saved.selected);
              setSubject(saved.subject);
              setPanel(saved.panel);
              setContext(saved.context);
              setQuery(saved.query);
            };
          }}
          onNavigate={(reference) => {
            go(reference.instrument, reference.section);
            setContext(reference.context);
          }}
        >
          <div className="grid min-w-0 gap-8 lg:grid-cols-[250px_minmax(0,1fr)]">
            <aside
              id={indexId}
              aria-label="Review index"
              className={`${mobileIndex ? 'block' : 'hidden'} max-h-[75dvh] min-w-0 overflow-y-auto rounded-lg border bg-muted/20 p-4 lg:sticky lg:top-5 lg:block lg:max-h-[85dvh] lg:self-start lg:overflow-y-auto`}
            >
              <h2 className="font-semibold text-base">
                <Trans>Review index</Trans>
              </h2>
              <p className="my-2 text-muted-foreground text-xs">
                {units.filter((unit) => reviewedTargetIds.includes(unit.id)).length} / {units.length}{' '}
                <Trans>units marked reviewed · coverage is not approval</Trans>
              </p>
              <nav aria-label="Review overview" className="my-4 space-y-1">
                <Button
                  className="w-full justify-start"
                  size="sm"
                  variant={panel === 'brief' ? 'secondary' : 'ghost'}
                  onClick={() => openPanel('brief')}
                >
                  <Trans>Engagement & brief</Trans>
                </Button>
                {reviewTools && (
                  <Button
                    className="w-full justify-start"
                    size="sm"
                    variant={panel === 'progress' ? 'secondary' : 'ghost'}
                    onClick={() => openPanel('progress')}
                  >
                    <Trans>Progress & findings</Trans>
                  </Button>
                )}
              </nav>
              <nav aria-label="Counsel package">
                <label className="block font-medium text-xs">
                  <Trans>Review document</Trans>
                  <select
                    className="my-2 h-10 w-full min-w-0 rounded-md border bg-background px-2 text-sm"
                    value={selected}
                    onChange={(event) => go(event.target.value)}
                  >
                    {snapshot.documents.map((document) => (
                      <option key={document.id} value={document.id}>
                        {document.title}
                      </option>
                    ))}
                    {snapshot.kind === 'provider' &&
                      snapshot.externalDocuments.map((document) => (
                        <option key={document.id} value={`processor:${document.id}`}>
                          {document.processor} · {document.title}
                        </option>
                      ))}
                    <option value="requirements">Disclosures & requirements</option>
                  </select>
                </label>
              </nav>
              <Input
                aria-label="Search review index"
                placeholder="Find review items…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="my-4 bg-background"
              />
              {active && (
                <fieldset aria-label="Index organization" className="mb-4 flex gap-1">
                  <button
                    type="button"
                    aria-pressed={indexMode === 'subjects'}
                    className={`rounded px-2 py-1.5 text-xs ${indexMode === 'subjects' ? 'bg-background font-semibold shadow-sm' : 'text-muted-foreground'}`}
                    onClick={() => setIndexMode('subjects')}
                  >
                    <Trans>Subjects</Trans>
                  </button>
                  <button
                    type="button"
                    aria-pressed={indexMode === 'all'}
                    className={`rounded px-2 py-1.5 text-xs ${indexMode === 'all' ? 'bg-background font-semibold shadow-sm' : 'text-muted-foreground'}`}
                    onClick={() => setIndexMode('all')}
                  >
                    <Trans>All items</Trans>
                  </button>
                </fieldset>
              )}
              <nav aria-label="Review contents" className="space-y-1">
                {query.trim() || (active && indexMode === 'all') ? (
                  <>
                    {!query.trim() && (
                      <Button variant="ghost" size="sm" onClick={() => go(selected)}>
                        <Trans>Read all items</Trans>
                      </Button>
                    )}
                    {results.length === 0 && (
                      <p className="py-3 text-muted-foreground text-sm">
                        <Trans>No matching review items.</Trans>
                      </p>
                    )}
                    {results.map((item) => (
                      <button
                        type="button"
                        key={item.slug}
                        className="block w-full rounded px-2 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => {
                          go(item.instrument, item.section);
                          focusReadingItem(legalItemId(item.slug));
                        }}
                      >
                        {item.reading.number && (
                          <span className="mr-2 text-muted-foreground">{item.reading.number}</span>
                        )}
                        {item.heading}
                        {query.trim() && (
                          <span className="mt-1 block text-muted-foreground text-xs">{item.documentTitle}</span>
                        )}
                      </button>
                    ))}
                  </>
                ) : active ? (
                  active.sections.map((section) => (
                    <button
                      type="button"
                      key={section.id}
                      aria-current={panel === 'reading' && subject === section.id ? 'location' : undefined}
                      className={`flex w-full justify-between gap-3 rounded px-2 py-2.5 text-left text-sm ${panel === 'reading' && subject === section.id ? 'bg-muted font-semibold' : 'hover:bg-muted'}`}
                      onClick={() => go(selected, section.id)}
                    >
                      <span>{section.name}</span>
                      <span className="text-muted-foreground">{section.items.length}</span>
                    </button>
                  ))
                ) : selected === 'requirements' ? (
                  snapshot.requirements.map((requirement) => (
                    <button
                      type="button"
                      key={requirement.slug}
                      className="block w-full rounded px-2 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => {
                        go('requirements');
                        focusReadingItem(legalItemId(`requirement:${requirement.slug}`));
                      }}
                    >
                      {requirement.jurisdictionName}
                    </button>
                  ))
                ) : null}
              </nav>
            </aside>
            <div className="min-w-0">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                <Button
                  className="lg:hidden"
                  variant="outline"
                  size="sm"
                  aria-expanded={mobileIndex}
                  aria-controls={indexId}
                  onClick={() => setMobileIndex(!mobileIndex)}
                >
                  <ListIcon className="mr-2 h-4 w-4" />
                  <Trans>Index</Trans>
                </Button>
                <span className="text-muted-foreground text-xs">
                  {items.filter((item) => item.kind === 'clause').length} <Trans>clauses</Trans> ·{' '}
                  {items.filter((item) => item.kind !== 'clause').length} <Trans>reusable items in this package</Trans>
                </span>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={large} onChange={(event) => setLarge(event.target.checked)} />
                  <Trans>Larger text</Trans>
                </label>
              </div>
              <h2 id={titleId} tabIndex={-1} className="mb-3 font-semibold text-3xl tracking-tight">
                {panel === 'brief' ? (
                  <Trans>Review brief</Trans>
                ) : panel === 'progress' ? (
                  <Trans>Progress & findings</Trans>
                ) : active ? (
                  (active.sections.find((section) => section.id === subject)?.name ?? active.title)
                ) : selected === 'requirements' ? (
                  <Trans>Disclosures & requirements</Trans>
                ) : (
                  <Trans>Processor form</Trans>
                )}
              </h2>
              <p className="mb-6 max-w-[78ch] text-muted-foreground text-sm leading-relaxed">
                <Trans>
                  Saved review copy. No merchant or partner may sign or receive this as an executed transaction.
                </Trans>
              </p>
              <div className="max-w-[78ch]" data-mca-reading-column>
                {panel === 'brief' && (
                  <>
                    <PackageReviewBrief snapshot={snapshot} large={large} />
                    <Button
                      className="mt-6"
                      onClick={() => go(snapshot.documents[0].id, snapshot.documents[0].sections[0]?.id ?? null)}
                    >
                      <Trans>Start reviewing</Trans>
                    </Button>
                  </>
                )}
                <div hidden={panel !== 'progress'}>{reviewTools}</div>
                {panel === 'reading' && active && (
                  <section className="space-y-5">
                    <p className="font-medium text-muted-foreground text-sm">{active.title}</p>
                    <p className="text-muted-foreground text-sm">
                      {active.counterparty} ·{' '}
                      {active.control === 'processor-controlled'
                        ? 'Payzli processor-controlled context; acceptance required separately'
                        : 'Authored provisions and reusable content'}
                    </p>
                    {context && (
                      <p className="rounded border p-3 text-sm">
                        <Trans>Reference context:</Trans> {context}{' '}
                        <Button variant="ghost" onClick={() => setContext(null)}>
                          {snapshot.kind === 'provider' ? (
                            <Trans>Return to saved selection</Trans>
                          ) : (
                            <Trans>Return to example numbering</Trans>
                          )}
                        </Button>
                      </p>
                    )}
                    {active.sections
                      .filter((section) => !subject || section.id === subject)
                      .map((section) => {
                        return (
                          <section key={section.id} className="space-y-8" data-mca-package-section={section.id}>
                            {!subject && <h3 className="border-b pb-3 font-semibold text-xl">{section.name}</h3>}
                            {section.items.map((item) => {
                              const ItemHeading = subject ? 'h3' : 'h4';
                              const reading =
                                (context ? snapshot.contexts[context]?.[item.slug] : null) ?? item.reading;
                              return (
                                <article
                                  key={item.slug}
                                  id={legalItemId(item.slug)}
                                  tabIndex={-1}
                                  data-mca-package-item={item.slug}
                                  className="scroll-mt-6 space-y-4 border-b pb-6 last:border-0"
                                >
                                  <ItemHeading className="font-semibold text-xl">
                                    {reading.number && <span className="mr-2">{reading.number}</span>}
                                    {item.heading}
                                  </ItemHeading>
                                  <p className="text-muted-foreground text-sm">
                                    {item.kind === 'clause'
                                      ? item.included
                                        ? snapshot.kind === 'provider'
                                          ? 'Saved provider selection'
                                          : 'Example selection'
                                        : 'Alternative — separate selection'
                                      : item.kind === 'guidance'
                                        ? 'Interview guidance — excluded from contracts'
                                        : 'Reusable content — no clause number'}
                                    {item.selectionNote ? ` · ${item.selectionNote}` : ''}
                                  </p>
                                  <LegalText sourceId={item.slug} segments={reading.segments} large={large} />
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
                {panel === 'reading' &&
                  snapshot.kind === 'provider' &&
                  snapshot.externalDocuments
                    .filter((document) => selected === `processor:${document.id}`)
                    .map((document) => (
                      <section
                        key={document.id}
                        className="space-y-4 rounded-lg border p-5"
                        data-mca-processor-review={document.id}
                      >
                        <h2 className="font-semibold text-2xl">{document.title}</h2>
                        <p>
                          {document.processor} · {document.version}
                        </p>
                        <p>{document.reference}</p>
                        <p className="text-muted-foreground text-sm">
                          <Trans>
                            Processor-controlled text supplied for this saved review; acceptance must be confirmed
                            separately.
                          </Trans>
                        </p>
                        {document.content ? (
                          <LegalText text={document.content} large={large} />
                        ) : (
                          <p role="alert">
                            <Trans>
                              The controlled processor form is missing. Request a new package containing the required
                              text before completing review.
                            </Trans>
                          </p>
                        )}
                      </section>
                    ))}
                {panel === 'reading' && selected === 'requirements' && (
                  <section className="space-y-5">
                    <p>
                      <Trans>
                        Determine coverage, exemptions, effective dates and required forms for each provider and
                        transaction. These saved source records do not certify current law.
                      </Trans>
                    </p>
                    {snapshot.requirements.map((requirement) => (
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
                            <a
                              key={url}
                              href={url}
                              rel="noreferrer"
                              target="_blank"
                              className="block break-all underline"
                            >
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
              </div>
            </div>
          </div>
        </ReferenceWorkspace>
      </main>
    </LegalWorkspace>
  );
};

const PackageReviewBrief = ({ snapshot, large }: { snapshot: McaReviewPackage; large: boolean }) => (
  <div className={`divide-y leading-relaxed ${large ? 'text-lg' : 'text-[15px]'}`} data-mca-review-brief>
    <section className="space-y-3 py-6 first:pt-0" key="scope">
      <p className="font-mono text-muted-foreground text-xs">01</p>
      <h3 className="font-semibold text-lg">
        <Trans>Who this review is for</Trans>
      </h3>
      {snapshot.kind === 'library' ? (
        <p>
          <Trans>
            This shared MCA library supports a provider interview, reusable provider templates, and then
            transaction-specific packages. The buyer and equipment provider are roles awaiting a provider’s legal
            identities. This review does not assume a particular funder’s business policy.
          </Trans>
        </p>
      ) : (
        <div className="space-y-2">
          <p>
            <Trans>
              This package contains the selected documents for a saved provider-template revision. Review the actual
              provider identities and policy, the remaining transaction elections, and the controlled processor form
              together. It is not a completed merchant transaction.
            </Trans>
          </p>
          <p className="font-semibold">
            {snapshot.provider.legalName} · <Trans>Saved provider revision</Trans> {snapshot.provider.revision}
          </p>
          <details>
            <summary className="cursor-pointer">
              <Trans>Saved provider policy</Trans>
            </summary>
            {snapshot.provider.policy.map((line) => (
              <p key={line} className="text-sm">
                {line}
              </p>
            ))}
          </details>
        </div>
      )}
    </section>
    <section className="space-y-3 py-6 first:pt-0" key="package">
      <p className="font-mono text-muted-foreground text-xs">02</p>
      <h3 className="font-semibold text-lg">
        <Trans>What is in this package</Trans>
      </h3>
      {snapshot.kind === 'library' && (
        <p>
          <Trans>
            Review all six instruments together, including reusable field groups, document blocks and interview
            guidance. Consider purchase characterization, collection and reconciliation, recourse, equipment
            obligations, permissions, broker duties and contradictions across documents. Only operative clauses receive
            numbers. Interview guidance is excluded from contracts.
          </Trans>
        </p>
      )}
      {snapshot.kind === 'library' && (
        <p>
          <Trans>
            Alternatives are review examples, not simultaneous obligations or confirmed commercial instructions. Each
            alternative uses its own numbering context. Provider answers determine the final selection and recipient;
            for example, the broker agreement is not a merchant agreement.
          </Trans>
        </p>
      )}
      <p className="text-sm">{snapshot.profileDescription}</p>
    </section>
    <section className="space-y-3 py-6 first:pt-0" key="processor">
      <p className="font-mono text-muted-foreground text-xs">03</p>
      <h3 className="font-semibold text-lg">
        <Trans>Processor-controlled material</Trans>
      </h3>
      {snapshot.kind === 'library' ? (
        <p>
          <Trans>
            The split-funding material is Payzli-specific processor-controlled context. Providers generally have limited
            ability to change processor forms. Record contradictions for review with the processor; this library cannot
            establish processor acceptance. Additional processors require their own forms.
          </Trans>
        </p>
      ) : (
        <p>
          <Trans>
            The processor form remains controlled by the named processor. Its title, version and reference come from
            this provider revision. Supplied text is preserved as submitted for review. Missing text is explicitly
            flagged and prevents review completion; no processor acceptance is inferred.
          </Trans>
        </p>
      )}
    </section>
    <section className="space-y-3 py-6 first:pt-0" key="sources">
      <p className="font-mono text-muted-foreground text-xs">04</p>
      <h3 className="font-semibold text-lg">
        <Trans>Disclosures and requirements</Trans>
      </h3>
      <p>
        <Trans>
          Disclosures and requirements are included with their source records and verification limitations. Some
          prescribe wording or layout; others require information with provider-authored wording. Review applicability
          and consistency without treating prescribed material as freely editable. These are source specifications, not
          completed transaction disclosures or confirmation of current law.
        </Trans>
      </p>
    </section>
    <section className="space-y-3 py-6 first:pt-0" key="findings">
      <p className="font-mono text-muted-foreground text-xs">05</p>
      <h3 className="font-semibold text-lg">
        <Trans>Findings and approval</Trans>
      </h3>
      <p>
        <Trans>
          Record findings beside the affected content. Staff record any attorney approval separately against exact
          wording. A clause approval does not approve the entire package, resolve other findings, or establish readiness
          to send.
        </Trans>
      </p>
      <p>
        <Trans>Review contact:</Trans> {snapshot.contact}
      </p>
    </section>
  </div>
);
