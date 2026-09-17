import { Badge } from '@documenso/ui/primitives/badge';
import { Button } from '@documenso/ui/primitives/button';
import { Input } from '@documenso/ui/primitives/input';
import { Trans } from '@lingui/react/macro';
import { BookOpenIcon, ListIcon } from 'lucide-react';
import { Fragment, type ReactNode, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { focusReadingItem, LegalText, LegalWorkspace, legalItemId, ReferenceWorkspace } from '../../legal-ui/reader';
import { subjectLabel } from '../../legal-ui/reading';
import { describeClauseVariance, describeWhyThisClause } from '../clauses/metadata';
import { mcaSectionHeading } from '../engine/section-headings';
import type { CounselReviewClause, CounselReviewView } from '../review/counsel-view';

const withEmphasis = (paragraph: string) =>
  paragraph.split(/\*\*(.+?)\*\*/g).map((part, index) => (index % 2 ? <strong key={index}>{part}</strong> : part));

export const McaCounselReader = ({
  view,
  renderFinding,
  findingError,
}: {
  view: CounselReviewView;
  renderFinding: (clause: CounselReviewClause) => ReactNode;
  findingError?: string;
}) => {
  const [params, setParams] = useSearchParams();
  const [indexMode, setIndexMode] = useState('subjects');
  const [query, setQuery] = useState('');
  const [mobileIndex, setMobileIndex] = useState(false);
  const [large, setLarge] = useState(false);
  const [read, setRead] = useState<Set<string>>(new Set());
  const clauses = view.sections.flatMap((section) =>
    section.clauses.map((clause) => ({ ...clause, section: section.id })),
  );
  const decisions = [
    ...new Set(clauses.flatMap((clause) => (clause.variance.kind === 'offered' ? [clause.variance.fact] : []))),
  ];
  const subject = view.sections.find((section) => section.id === params.get('subject'));
  const decision = decisions.find((fact) => fact === params.get('decision'));
  const showBrief = !subject && !decision && params.get('view') !== 'all';
  const context = params.get('context') ?? '';
  const sectionTitle = (section: string) =>
    mcaSectionHeading(
      section,
      clauses
        .filter((clause) => clause.section === section)
        .map((clause) => ({ number: (view.readingContexts[context]?.[clause.slug] ?? clause.reading).number })),
      view.instrument.id,
    );
  const selected = decision
    ? clauses.filter((clause) => clause.variance.kind === 'offered' && clause.variance.fact === decision)
    : subject
      ? clauses.filter((clause) => clause.section === subject.id)
      : clauses;
  // Offered alternatives are reviewed together, even when another branch has a different section.
  const selectedDecisions = new Set(
    selected.flatMap((clause) => (clause.variance.kind === 'offered' ? [clause.variance.fact] : [])),
  );
  const ordered = clauses.filter(
    (clause) =>
      selected.some((item) => item.slug === clause.slug) ||
      (clause.variance.kind === 'offered' && selectedDecisions.has(clause.variance.fact)),
  );
  const groups: { id: string; title: string | null; items: typeof clauses }[] = [];
  for (const clause of ordered) {
    const key = clause.variance.kind === 'offered' ? clause.variance.fact : clause.slug;
    const group = groups.find((entry) => entry.id === key);
    if (group) {
      group.items.push(clause);
    } else {
      groups.push({
        id: key,
        title: clause.variance.kind === 'offered' ? subjectLabel(key.replace(/([a-z])([A-Z])/g, '$1-$2')) : null,
        items: [clause],
      });
    }
  }
  // Keep business alternatives together. Add a parent whenever the displayed
  // sequence enters a section, including an alternative in another section.
  const displayed = groups.flatMap((group) => group.items);
  const sectionStarts = new Set(
    displayed.filter((clause, index) => clause.section !== displayed[index - 1]?.section).map((clause) => clause.slug),
  );
  const go = (values: Record<string, string>) => {
    setParams(values, { preventScrollReset: true });
    setMobileIndex(false);
    focusReadingItem('counsel-reading-title');
  };
  const openItem = (slug: string) => {
    const target = clauses.find((item) => item.slug === slug);
    if (target) {
      go({ subject: target.section, item: slug });
      focusReadingItem(legalItemId(slug));
    }
  };
  return (
    <LegalWorkspace>
      <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b pb-5">
          <div>
            <p className="font-medium text-muted-foreground text-xs uppercase tracking-widest">
              <Trans>Pacta · Counsel workspace</Trans>
            </p>
            <h1 className="mt-2 font-semibold text-2xl tracking-tight">{view.instrument.title}</h1>
            <p className="mt-1 text-muted-foreground text-sm">
              <Trans>Reusable clause review</Trans> · {view.reviewerName}
            </p>
          </div>
          <Button variant="outline" onClick={() => go({})}>
            <BookOpenIcon className="mr-2 h-4 w-4" />
            <Trans>Review brief</Trans>
          </Button>
        </header>
        {view.agreementMoved && (
          <p role="alert" className="mb-5 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950 text-sm">
            <Trans>
              This review content has changed since the link was sent. Request a fresh link before recording findings
              against it.
            </Trans>
          </p>
        )}
        <ReferenceWorkspace
          items={clauses}
          contexts={view.readingContexts}
          captureReturn={() => {
            const saved = new URLSearchParams(params);
            return () => setParams(saved, { preventScrollReset: true });
          }}
          onNavigate={(reference) => {
            const target = clauses.find((item) => item.slug === reference.targetSlug);
            if (target) {
              setParams(
                { subject: target.section, item: target.slug, context: reference.context },
                { preventScrollReset: true },
              );
            }
          }}
        >
          <div className="grid min-w-0 gap-8 lg:grid-cols-[250px_minmax(0,1fr)]">
            <aside
              className={`${mobileIndex ? 'block' : 'hidden'} min-w-0 rounded-lg border bg-muted/20 p-4 lg:sticky lg:top-5 lg:block lg:max-h-[85dvh] lg:self-start lg:overflow-y-auto`}
              aria-label="Review index"
            >
              <h2 className="font-semibold">
                <Trans>Review index</Trans>
              </h2>
              <p className="my-2 text-muted-foreground text-xs">
                {read.size} / {clauses.length} <Trans>read this session · reading is not approval</Trans>
              </p>
              <Input
                aria-label="Search review index"
                placeholder="Find a clause…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="my-4 bg-background"
              />
              <fieldset className="mb-4 flex min-w-0 gap-1" aria-label="Index organization">
                {['subjects', 'decisions', 'all'].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={mode === indexMode}
                    className={`rounded px-2 py-1.5 text-xs ${indexMode === mode ? 'bg-background font-semibold shadow-sm' : 'text-muted-foreground'}`}
                    onClick={() => setIndexMode(mode)}
                  >
                    {subjectLabel(mode)}
                  </button>
                ))}
              </fieldset>
              <nav className="space-y-1" aria-label="Review contents">
                <Button
                  className="mb-3 w-full justify-start"
                  variant={showBrief ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => go({})}
                >
                  <Trans>Engagement & brief</Trans>
                </Button>
                {query || indexMode === 'all' ? (
                  <>
                    {!query && (
                      <Button variant="ghost" size="sm" onClick={() => go({ view: 'all' })}>
                        <Trans>Read all items</Trans>
                      </Button>
                    )}
                    {clauses
                      .filter((clause) =>
                        `${clause.heading} ${clause.text} ${clause.number ?? ''}`
                          .toLocaleLowerCase()
                          .includes(query.toLocaleLowerCase()),
                      )
                      .map((clause) => (
                        <Link
                          className="block w-full rounded px-2 py-2 text-left text-sm hover:bg-muted"
                          preventScrollReset
                          to={`?${new URLSearchParams({ subject: clause.section, item: clause.slug })}`}
                          key={clause.slug}
                          onClick={() => {
                            setMobileIndex(false);
                            focusReadingItem(legalItemId(clause.slug));
                          }}
                        >
                          {clause.number && <span className="mr-2 text-muted-foreground">{clause.number}</span>}
                          {clause.heading}
                        </Link>
                      ))}
                  </>
                ) : indexMode === 'decisions' ? (
                  <>
                    {decisions.length === 0 && (
                      <p className="text-muted-foreground text-xs">
                        <Trans>No offered wording alternatives in this scope.</Trans>
                      </p>
                    )}
                    {decisions.map((fact) => (
                      <button
                        key={fact}
                        type="button"
                        className="block w-full rounded px-2 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => go({ decision: fact })}
                      >
                        {subjectLabel(fact.replace(/([a-z])([A-Z])/g, '$1-$2'))}
                      </button>
                    ))}
                  </>
                ) : (
                  view.sections.map((section) => (
                    <button
                      key={section.id}
                      type="button"
                      aria-current={subject?.id === section.id ? 'location' : undefined}
                      className={`flex w-full justify-between gap-3 rounded px-2 py-2.5 text-left text-sm ${subject?.id === section.id ? 'bg-muted font-semibold' : 'hover:bg-muted'}`}
                      onClick={() => go({ subject: section.id })}
                    >
                      {sectionTitle(section.id)}
                      <span className="text-muted-foreground">{section.clauses.length}</span>
                    </button>
                  ))
                )}
              </nav>
            </aside>
            <div className="min-w-0">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                <Button className="lg:hidden" variant="outline" size="sm" onClick={() => setMobileIndex(!mobileIndex)}>
                  <ListIcon className="mr-2 h-4 w-4" />
                  <Trans>Index</Trans>
                </Button>
                <span className="text-muted-foreground text-xs">
                  {clauses.filter((item) => item.kind === 'clause').length} clauses ·{' '}
                  {clauses.filter((item) => item.kind !== 'clause').length} reusable items
                </span>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={large} onChange={(event) => setLarge(event.target.checked)} />
                  <Trans>Larger text</Trans>
                </label>
              </div>
              <h2 id="counsel-reading-title" tabIndex={-1} className="mb-3 font-semibold text-3xl tracking-tight">
                {showBrief ? (
                  <Trans>Review brief</Trans>
                ) : subject ? (
                  sectionTitle(subject.id)
                ) : decision ? (
                  subjectLabel(decision.replace(/([a-z])([A-Z])/g, '$1-$2'))
                ) : (
                  <Trans>All review items</Trans>
                )}
              </h2>
              {showBrief ? (
                <>
                  <p className="mb-8 max-w-[75ch] text-muted-foreground leading-relaxed">
                    <Trans>
                      This library supplies wording for future agreements. Review the shared provisions and the complete
                      business alternatives. A business selects its model when preparing its own package.
                    </Trans>
                  </p>
                  <div className="max-w-[78ch] divide-y">
                    {view.briefing.map((part, index) => (
                      <section key={part.id} className="py-6 first:pt-0">
                        <p className="mb-2 font-mono text-muted-foreground text-xs">
                          {String(index + 1).padStart(2, '0')}
                        </p>
                        <h3 className="mb-3 font-semibold text-lg">{part.title}</h3>
                        {part.body.map((paragraph, i) => (
                          <p key={i} className="mt-3 text-[15px] leading-relaxed">
                            {withEmphasis(paragraph)}
                          </p>
                        ))}
                      </section>
                    ))}
                  </div>
                  <Button className="mt-6" onClick={() => go({ subject: view.sections[0]?.id ?? '', view: 'all' })}>
                    <Trans>Start reviewing</Trans>
                  </Button>
                </>
              ) : (
                <>
                  <p className="mb-6 max-w-[78ch] text-muted-foreground text-sm leading-relaxed">
                    <Trans>
                      Numbers belong to the indicated example selection. Offered alternatives have equal standing; they
                      are separate wording choices.
                    </Trans>
                  </p>
                  {context && (
                    <p className="mb-6 rounded-md bg-muted p-3 text-xs">
                      <Trans>Reading in citation context</Trans>: {context}
                    </p>
                  )}
                  {findingError && (
                    <p role="alert" className="mb-5 text-destructive text-sm">
                      <Trans>Saved findings could not be loaded.</Trans> {findingError}
                    </p>
                  )}
                  <div className="space-y-9">
                    {groups.map((group) => (
                      <section
                        key={group.id}
                        className={group.title ? 'overflow-hidden rounded-xl border border-primary/25' : ''}
                      >
                        {group.title && (
                          <header className="border-b bg-muted/40 px-5 py-4">
                            <p className="mb-1 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                              <Trans>Business decision · full alternatives</Trans>
                            </p>
                            <h3 className="font-semibold text-xl">{group.title}</h3>
                          </header>
                        )}
                        <div className={group.title ? 'divide-y' : ''}>
                          {group.items.map((clause) => {
                            const reading = view.readingContexts[context]?.[clause.slug] ?? clause.reading;
                            const showParent =
                              sectionStarts.has(clause.slug) && (!subject || clause.section !== subject.id);
                            const ClauseHeading = subject && clause.section === subject.id ? 'h3' : 'h4';
                            return (
                              <Fragment key={clause.slug}>
                                {showParent && (
                                  <h3
                                    data-mca-section-heading={clause.section}
                                    className={`mb-5 border-b pb-3 font-semibold text-2xl ${group.title ? 'px-5 pt-5' : ''}`}
                                  >
                                    {sectionTitle(clause.section)}
                                  </h3>
                                )}
                                <article
                                  data-mca-slug={clause.slug}
                                  id={legalItemId(clause.slug)}
                                  tabIndex={-1}
                                  className={`scroll-mt-8 ${group.title ? 'p-5 sm:p-7' : 'border-b pb-8'}`}
                                >
                                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                                    <ClauseHeading className="font-semibold text-xl">
                                      {reading.number && (
                                        <button
                                          className="mr-3 text-primary underline underline-offset-4"
                                          type="button"
                                          onClick={() => openItem(clause.slug)}
                                        >
                                          {reading.number}
                                        </button>
                                      )}
                                      {clause.heading}
                                    </ClauseHeading>
                                    <Badge variant={clause.approved ? 'default' : 'neutral'}>
                                      {clause.approved ? (
                                        <Trans>Current approval</Trans>
                                      ) : (
                                        <Trans>No current approval</Trans>
                                      )}
                                    </Badge>
                                  </div>
                                  {clause.kind !== 'clause' && (
                                    <p className="mb-3 text-muted-foreground text-xs">
                                      {clause.kind === 'guidance' ? (
                                        <Trans>Interview guidance — excluded from the contract</Trans>
                                      ) : clause.kind === 'field-group' ? (
                                        <Trans>Required document fields</Trans>
                                      ) : (
                                        <Trans>Required document block</Trans>
                                      )}
                                    </p>
                                  )}
                                  <p className="mb-5 text-muted-foreground text-xs">
                                    {clause.selectionNote ?? (
                                      <Trans>Example selection · shared wording where applicable</Trans>
                                    )}
                                  </p>
                                  <LegalText sourceId={clause.slug} segments={reading.segments} large={large} />
                                  {clause.fields && (
                                    <dl className="my-5 grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
                                      {clause.fields.map((field) => (
                                        <div key={field.widget}>
                                          <dt className="font-medium text-sm">{field.label}</dt>
                                          <dd className="my-1 break-all font-mono text-xs">{field.widget}</dd>
                                          <dd className="text-muted-foreground text-xs">
                                            {field.requiredWhen ? (
                                              <Trans>Required for an entity guarantor</Trans>
                                            ) : field.required ? (
                                              <Trans>Required</Trans>
                                            ) : (
                                              <Trans>Optional</Trans>
                                            )}
                                          </dd>
                                        </div>
                                      ))}
                                    </dl>
                                  )}
                                  {clause.repeatFor && (
                                    <p className="my-3 text-sm">
                                      <Trans>
                                        A separate identity and signature block is required for each guarantor.
                                      </Trans>
                                    </p>
                                  )}
                                  {clause.retiredFields && (
                                    <p className="my-3 text-muted-foreground text-xs">
                                      <Trans>Retired source fields are excluded from the document:</Trans>{' '}
                                      {clause.retiredFields
                                        .map((field) => `${field.widget}: ${field.reason}`)
                                        .join('; ')}
                                    </p>
                                  )}
                                  <details className="mt-5 text-sm">
                                    <summary className="cursor-pointer font-medium">
                                      <Trans>Purpose & wording constraints</Trans>
                                    </summary>
                                    <p className="mt-2 text-muted-foreground">
                                      {describeWhyThisClause(clause.whyThisClause)}
                                    </p>
                                    <p className="mt-2 text-muted-foreground">
                                      {describeClauseVariance(clause.variance)}
                                    </p>
                                  </details>
                                  <details className="mt-4 rounded-lg border bg-muted/20 p-4">
                                    <summary className="cursor-pointer font-medium text-sm">
                                      <Trans>Findings on this item</Trans>
                                    </summary>
                                    {renderFinding(clause)}
                                  </details>
                                  <label className="mt-4 flex items-center gap-2 text-muted-foreground text-xs">
                                    <input
                                      type="checkbox"
                                      checked={read.has(clause.slug)}
                                      onChange={(event) =>
                                        setRead((old) => {
                                          const next = new Set(old);
                                          if (event.target.checked) {
                                            next.add(clause.slug);
                                          } else {
                                            next.delete(clause.slug);
                                          }
                                          return next;
                                        })
                                      }
                                    />
                                    <Trans>Read this session</Trans>
                                  </label>
                                </article>
                              </Fragment>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                  {subject && (
                    <nav className="mt-8 flex flex-wrap gap-3" aria-label="Adjacent subjects">
                      {view.sections
                        .slice(Math.max(0, view.sections.indexOf(subject) - 1), view.sections.indexOf(subject) + 2)
                        .filter((section) => section !== subject)
                        .map((section) => (
                          <Button key={section.id} variant="outline" onClick={() => go({ subject: section.id })}>
                            {sectionTitle(section.id)}
                          </Button>
                        ))}
                    </nav>
                  )}
                </>
              )}
            </div>
          </div>
        </ReferenceWorkspace>
      </div>
    </LegalWorkspace>
  );
};
