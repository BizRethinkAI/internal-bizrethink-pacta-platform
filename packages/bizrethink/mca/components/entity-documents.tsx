import { Trans } from '@lingui/react/macro';

import { INSTRUMENTS } from '../clauses/instruments';

/**
 * What these answers entitle this entity to have templates for.
 *
 * The end of the interview, and the first moment the answers add up to
 * something. Derived from `instrumentsFor` — the same function the compiler
 * uses — so it cannot offer a document `compileMcaTemplate` would refuse.
 *
 * A split funding letter never appears here: ADR 0019 keeps it the processor's,
 * supplied fixed, and ADR 0026 §6 keeps it out of templates entirely.
 */
export const McaDocumentsThisEntityCanHave = ({ documents }: { documents: string[] }) => (
  <section className="space-y-2 rounded-lg border p-4" data-mca-entitled-documents>
    <h3 className="font-semibold">
      <Trans>Documents these answers allow</Trans>
    </h3>
    <p className="text-muted-foreground text-sm">
      <Trans>
        Once this entity is saved you can create a template for each of these. A template is one document, and it copies
        these answers as they stand at that moment.
      </Trans>
    </p>
    {documents.length === 0 ? (
      <p className="text-muted-foreground text-sm">
        <Trans>Answer the questions above to see which documents this programme runs.</Trans>
      </p>
    ) : (
      <ul className="list-disc space-y-1 pl-5 text-sm">
        {documents.map((instrument) => (
          <li key={instrument}>{INSTRUMENTS[instrument as keyof typeof INSTRUMENTS]?.title ?? instrument}</li>
        ))}
      </ul>
    )}
  </section>
);
