import { NEXT_PUBLIC_WEBAPP_URL } from '@documenso/lib/constants/app';

import type { LeaseDocument } from './derive-documents';

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
  const base = NEXT_PUBLIC_WEBAPP_URL().replace(/\/$/, '');

  return documents
    .filter((document) => document.kind === 'hoa-governing')
    .map((document) => ({
      label: document.label,
      data: `${base}/lease-attachment/${matterId}/${document.id}`,
      type: 'link' as const,
    }));
};
