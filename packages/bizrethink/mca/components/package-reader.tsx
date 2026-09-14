import { Button } from '@documenso/ui/primitives/button';
import { Trans } from '@lingui/react/macro';
import { useState } from 'react';
import { focusReadingItem, LegalText, legalItemId, ReferenceWorkspace } from '../../legal-ui/reader';
import type { LegalReading } from '../../legal-ui/reading';
import { groupMcaSections } from '../engine/section-headings';
import type { McaTemplateDocument } from '../templates/compile';
import type { McaDraftSignature } from '../transactions/fill';

/** The index follows compiled documents, including repeated report-subject instances. */
export const McaPackageReader = ({
  documents,
  unfilled = false,
}: {
  documents: (McaTemplateDocument & { id?: string; signatures?: McaDraftSignature[] })[];
  unfilled?: boolean;
}) => {
  const [selectedId, setSelectedId] = useState(documents[0]?.id ?? documents[0]?.instrument ?? '');
  const selected = documents.find((document) => (document.id ?? document.instrument) === selectedId) ?? documents[0];
  const projected = documents.map((document) => {
    const id = document.id ?? document.instrument;
    const labels = new Map(document.items.flatMap((item) => item.fields.map((field) => [field.binding, field.label])));
    const readable = (text: string) =>
      unfilled
        ? text.replace(/\{\{field:([^}]+)\}\}/g, (_token, binding: string) => `[${labels.get(binding) ?? binding}]`)
        : text;
    return {
      ...document,
      id,
      reportSubjectName: document.items
        .flatMap((item) => item.fields)
        .find((field) => field.binding === 'report.subjectName')?.value,
      items: document.items.map((item) => ({
        ...item,
        sourceSlug: item.slug,
        slug: `${id}:${item.slug}`,
        instrument: document.instrument,
        reading: {
          number: item.number,
          context: 'Compiled selection',
          segments: (item.reading?.segments ?? [{ kind: 'text' as const, text: item.body }]).map((part) => {
            if (part.kind === 'text') {
              return { ...part, text: readable(part.text) };
            }
            const targets = documents.filter((candidate) => candidate.instrument === part.instrument);
            const targetDocument =
              part.instrument === document.instrument ? document : targets.length === 1 ? targets[0] : null;
            return {
              ...part,
              context: 'Compiled selection',
              targetSlug: targetDocument
                ? `${targetDocument.id ?? targetDocument.instrument}:${part.targetSlug}`
                : `unavailable:${part.targetSlug}`,
            };
          }),
        } satisfies LegalReading,
      })),
    };
  });
  const items = projected.flatMap((document) => document.items);
  const active = projected.find((document) => document.id === (selected?.id ?? selected?.instrument));
  const contexts = { 'Compiled selection': Object.fromEntries(items.map((item) => [item.slug, item.reading])) };
  if (!active) {
    return (
      <p className="text-muted-foreground text-sm">
        <Trans>No documents in this selection.</Trans>
      </p>
    );
  }
  return (
    <ReferenceWorkspace
      items={items}
      contexts={contexts}
      captureReturn={() => {
        const id = active.id;
        return () => setSelectedId(id);
      }}
      onNavigate={(reference) => {
        const document = projected.find((candidate) =>
          candidate.items.some((item) => item.slug === reference.targetSlug),
        );
        if (document) {
          setSelectedId(document.id);
        }
      }}
    >
      <div className="space-y-5" data-mca-package-reader>
        <label className="flex flex-wrap items-center gap-3 font-medium text-sm">
          <Trans>Document</Trans>
          <select
            aria-label="Package document"
            className="h-10 min-w-0 max-w-full rounded-md border bg-background px-3"
            value={active.id}
            onChange={(event) => setSelectedId(event.target.value)}
          >
            {projected.map((document, index) => (
              <option key={document.id} value={document.id}>
                {index + 1}. {document.title}
                {document.reportSubjectName ? ` · ${document.reportSubjectName}` : ''}
              </option>
            ))}
          </select>
        </label>
        <details className="rounded-lg border bg-muted/20 p-3">
          <summary className="cursor-pointer font-medium text-sm">
            <Trans>Document index</Trans> · {active.items.length} items
          </summary>
          <nav className="mt-3 space-y-4" aria-label="Document index">
            {groupMcaSections(active.items).map((section, index) => (
              <div key={`${section.section}:${index}`}>
                <p className="mb-2 font-semibold text-sm">{section.heading}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {section.items.map((item) => (
                    <button
                      key={item.slug}
                      type="button"
                      className="rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                      onClick={() => focusReadingItem(legalItemId(item.slug))}
                    >
                      {item.number} {item.heading}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </details>
        {active.transactionSelection !== 'always' && unfilled && (
          <p className="rounded-lg bg-muted p-3 text-muted-foreground text-sm">
            <Trans>This separate document is included only when its transaction or channel choice applies.</Trans>
          </p>
        )}
        <div className="space-y-7 rounded-lg border p-5 sm:p-7">
          {groupMcaSections(active.items).map((section, index) => (
            <section key={`${section.section}:${index}`} data-mca-section={section.section} className="space-y-7">
              <h3 className="border-b pb-3 font-semibold text-xl">{section.heading}</h3>
              {section.items.map((item) => (
                <article
                  key={item.slug}
                  id={legalItemId(item.slug)}
                  tabIndex={-1}
                  data-mca-template-item={item.sourceSlug}
                  className="scroll-mt-8 border-b pb-7 last:border-0 last:pb-0"
                >
                  <h4 className="mb-4 font-semibold text-lg">
                    {item.number && (
                      <button
                        type="button"
                        className="mr-2 text-primary underline underline-offset-4"
                        onClick={() => focusReadingItem(legalItemId(item.slug))}
                      >
                        {item.number}
                      </button>
                    )}
                    {item.heading}
                  </h4>
                  <LegalText sourceId={item.slug} segments={item.reading.segments} />
                  {item.repeatFor && unfilled && (
                    <p className="mt-3 text-muted-foreground text-sm">
                      <Trans>
                        Repeat for each guarantor in this instrument; each signs separately in the stated capacity.
                      </Trans>
                    </p>
                  )}
                  {item.fields.length > 0 && (
                    <dl className="mt-4 grid gap-4 rounded-md bg-muted/20 p-4 sm:grid-cols-2">
                      {item.fields
                        .filter(
                          (field) => unfilled || (field.kind !== 'signature' && !field.binding.endsWith('.signedDate')),
                        )
                        .map((field) => (
                          <div key={field.widget}>
                            <dt className="text-muted-foreground text-xs">{field.label}</dt>
                            <dd className="mt-1 break-words text-sm">{field.value || '—'}</dd>
                          </div>
                        ))}
                    </dl>
                  )}
                </article>
              ))}
            </section>
          ))}
        </div>
        {active.signatures && (
          <section className="rounded-lg border p-5">
            <h3 className="mb-3 font-semibold">
              <Trans>Separate unsigned execution locations</Trans>
            </h3>
            {active.signatures.map((signature, index) => (
              <p key={`${signature.role}-${index}`} className="mt-2 text-sm">
                {signature.role}: {signature.partyName} — {signature.signerName} ({signature.capacity})
              </p>
            ))}
          </section>
        )}
        <nav className="flex flex-wrap gap-3" aria-label="Adjacent documents">
          {projected
            .filter((_document, index) => Math.abs(index - projected.indexOf(active)) === 1)
            .map((document) => (
              <Button
                key={document.id}
                variant="outline"
                onClick={() => {
                  setSelectedId(document.id);
                  focusReadingItem(legalItemId(document.items[0]?.slug ?? ''));
                }}
              >
                {document.title}
              </Button>
            ))}
        </nav>
      </div>
    </ReferenceWorkspace>
  );
};
