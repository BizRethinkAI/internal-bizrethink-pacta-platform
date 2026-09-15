import { z } from 'zod';

const ZReading = z.object({
  number: z.string().nullable(),
  context: z.string(),
  segments: z.array(
    z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('text'), text: z.string() }),
      z.object({
        kind: z.literal('reference'),
        text: z.string(),
        targetKind: z.enum(['clause', 'section']),
        targetSlug: z.string(),
        instrument: z.string(),
        section: z.string(),
        context: z.string(),
      }),
    ]),
  ),
});

export const ZReviewPackage = z.object({
  schemaVersion: z.literal(1),
  kind: z.literal('library'),
  title: z.string(),
  contact: z.string(),
  profileDescription: z.string(),
  documents: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      counterparty: z.string(),
      control: z.enum(['authored', 'processor-controlled']),
      sections: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          items: z.array(
            z.object({
              slug: z.string(),
              version: z.string(),
              sourceFingerprint: z.string(),
              heading: z.string(),
              number: z.string().nullable(),
              text: z.string(),
              kind: z.enum(['clause', 'field-group', 'document-block', 'guidance']),
              included: z.boolean(),
              selectionNote: z.string().nullable(),
              reading: ZReading,
              rationale: z.string(),
              variation: z.string(),
              states: z.array(z.string()),
              fields: z.array(
                z.object({
                  label: z.string(),
                  binding: z.string(),
                  kind: z.string(),
                  required: z.boolean(),
                  condition: z.string().nullable(),
                }),
              ),
              repeatFor: z.string().nullable(),
            }),
          ),
        }),
      ),
    }),
  ),
  contexts: z.record(z.record(ZReading)),
  requirements: z.array(
    z.object({
      slug: z.string(),
      jurisdiction: z.string(),
      jurisdictionName: z.string(),
      citation: z.string(),
      kind: z.enum(['prescribed-form', 'itemization', 'content-statute']),
      transaction: z.string(),
      sourceDigest: z.string(),
      observedDigest: z.string().nullable(),
      sourceEvidence: z.string(),
      sourceUrls: z.array(z.string().url()),
      lastReadAt: z.string().nullable(),
      verbatimVerifiedAt: z.string().nullable(),
      structureVerifiedAt: z.string().nullable(),
      limitations: z.array(z.string()),
      entries: z.array(z.object({ label: z.string(), paragraphs: z.array(z.string()) })),
    }),
  ),
});

export type McaReviewPackage = z.infer<typeof ZReviewPackage>;
export type McaReviewItem = McaReviewPackage['documents'][number]['sections'][number]['items'][number];
