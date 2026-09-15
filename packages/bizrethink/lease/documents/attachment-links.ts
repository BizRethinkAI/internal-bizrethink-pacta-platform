import type { LeaseDocument } from './derive-documents';
import { governingBundleUrl, governingDocumentUrl } from './document-urls';
import { structureGoverningDocuments } from './governing-structure';

export type LeaseAttachment = {
  label: string;
  data: string;
  type: 'link';
};

/**
 * The governing documents as links a SIGNER can open, for the envelope's
 * attachment popover.
 *
 * The receipt addendum names sixteen instruments and has the tenant acknowledge
 * receiving them. Documenso already renders an envelope's attachments beside
 * the document being signed — `document-signing-page-view-v2.tsx` mounts
 * `DocumentSigningAttachmentsPopover`, which hides itself when the list is
 * empty. Nothing ever populated it, so the popover was invisible and the
 * acknowledgement was stronger than the delivery.
 *
 * WHY LINKS AND NOT THE BYTES. `EnvelopeAttachment.type` is `z.enum(['link'])`
 * — it carries a URL and never a file — and bundling the documents as envelope
 * items would put a 155-page declaration in front of a signer who came to read
 * a lease. One line per instrument, opened on demand, is the trade
 * `derive-documents` already made for the receipt page itself.
 *
 * THE LABELS ARE THE REGISTER'S. Whatever the receipt addendum recites, the
 * popover lists — same names, same order — so a signer matching one against the
 * other finds them identical.
 */
export const attachmentLinks = (matterId: string, documents: LeaseDocument[]): LeaseAttachment[] => {
  const governing = documents.filter((document) => document.kind === 'hoa-governing');

  /*
    In the receipt's order, with its numbers and descriptions: "1a. Ninth
    Amendment to the Declaration — leasing rules". Seven amendments share their
    first forty characters; the number and the description are what tell them
    apart on a signing screen.
  */
  const each = structureGoverningDocuments(governing, {}).flatMap((group) =>
    group.entries.map(({ document, number }) => {
      const description = (document.description ?? '').trim();

      return {
        label: `${number}. ${document.label.trim()}${description === '' ? '' : ` — ${description}`}`,
        data: governingDocumentUrl(matterId, document.id),
        type: 'link' as const,
      };
    }),
  );

  /*
    ONE DOWNLOAD FOR ALL OF THEM, FIRST. Sixteen documents meant sixteen clicks,
    and the repository owner's verdict on that was "not very user friendly". Only
    where there is more than one — a single document is already one download.
  */
  if (governing.length < 2) {
    return each;
  }

  return [
    {
      label: `All ${governing.length} documents, in one download`,
      data: governingBundleUrl(matterId),
      type: 'link' as const,
    },
    ...each,
  ];
};
