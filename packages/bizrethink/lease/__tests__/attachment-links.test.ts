import { describe, expect, it } from 'vitest';

import { attachmentLinks } from '../documents/attachment-links';
import type { LeaseDocument } from '../documents/derive-documents';

/**
 * THE RECEIPT SAID THEY HAD THE DOCUMENTS; THE SIGNING FLOW DID NOT GIVE THEM.
 *
 * The addendum has the tenant acknowledge receiving each governing document
 * "and has had the opportunity to read them". A REVIEWER could open them —
 * `lease-review.$token.attachment.$documentId` — but that route is scoped to a
 * review token, and the signing view had no attachment route at all. So the
 * acknowledgement was stronger than the delivery for the one person it binds.
 *
 * Documenso already renders an envelope's attachments beside the document being
 * signed, and hides the control when the list is empty. Nothing populated it.
 */

const doc = (over: Partial<LeaseDocument> = {}): LeaseDocument => ({
  id: 'bdoc_0000000000000000',
  kind: 'hoa-governing',
  label: 'Ninth Amendment to the Declaration',
  reference: 'Instr# 2021271188',
  documentDate: '2021-12-16',
  pageCount: 5,
  ...over,
});

describe('the governing documents reach a signer as links', () => {
  it('gives one link per document, labelled as the receipt recites it', () => {
    const links = attachmentLinks('lease_matter_abc', [
      doc({ id: 'bdoc_a', label: 'Amended and Restated Master Declaration' }),
      doc({ id: 'bdoc_b', label: 'Ninth Amendment to the Declaration' }),
    ]);

    expect(links).toHaveLength(2);
    expect(links.map((link) => link.label)).toEqual([
      'Amended and Restated Master Declaration',
      'Ninth Amendment to the Declaration',
    ]);
  });

  it('is a link, which is the only thing an EnvelopeAttachment can carry', () => {
    for (const link of attachmentLinks('lease_matter_abc', [doc()])) {
      expect(link.type).toBe('link');
    }
  });

  /*
    `toSafeHref` drops anything that is not an http(s) URL, and it does it
    silently — the popover would simply render a dead entry.
  */
  it('builds an absolute http URL, or the popover renders nothing', () => {
    const [link] = attachmentLinks('lease_matter_abc', [doc({ id: 'bdoc_z' })]);

    expect(link.data).toMatch(/^https?:\/\//);
    expect(link.data).toContain('/lease-attachment/lease_matter_abc/bdoc_z');
  });

  /*
    THE CARVE-OUT THAT MAKES A CAPABILITY URL ACCEPTABLE. A governing document
    is a public record, already obtainable from the county recorder. A move-in
    report is photographs of the inside of somebody's home. Only the first may
    be reachable by holding a link; the route enforces this too.
  */
  it('never links a move-in report', () => {
    const links = attachmentLinks('lease_matter_abc', [
      doc({ id: 'bdoc_public' }),
      doc({ id: 'bdoc_private', kind: 'move-in-report', label: 'Move-in inspection' }),
    ]);

    expect(links).toHaveLength(1);
    expect(links[0].data).toContain('bdoc_public');
  });

  it('returns nothing when the property has no governing documents', () => {
    expect(attachmentLinks('lease_matter_abc', [])).toEqual([]);
  });
});
